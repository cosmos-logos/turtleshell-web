import { useEnvironmentStore, applyClusterOverride } from '@/lib/store/environment-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { buildMCPHeaders } from './mcp-headers';
import { getShellId } from '@/lib/api/olympus-grid-client';
import { useChatStore } from '@/lib/store/chat-store';
import { getToolBindingsForAgent } from '@/lib/store/tool-bindings-store';

/**
 * Stream a chat message to the Athena LLM backend.
 * Returns an async generator that yields content tokens.
 *
 * Handles multiple response formats:
 * - Structured SSE: data: {"type":"token","content":"..."}
 * - Raw text SSE: data: Hello
 * - OpenAI-compatible SSE: data: {"choices":[{"delta":{"content":"..."}}]}
 * - NDJSON: {"type":"token","content":"..."}
 * - Plain text streaming (no SSE framing)
 */
export async function* streamChat(
  prompt: string,
  signal?: AbortSignal,
  conversationId?: string | null,
  options?: { memoryEnabled?: boolean; saveConversation?: boolean; systemPrompt?: string; agentId?: string; endpointOverride?: string },
): AsyncGenerator<string | { conversationId: string }, void, unknown> {
  // Resolve base URL: explicit endpoint > connected cosmos agent > environment preset
  const activeChatAgentId = useCosmosLogosStore.getState().activeChatAgentId;
  const cosmosAgent = activeChatAgentId
    ? useCosmosLogosStore.getState().agents.find(a => a.id === activeChatAgentId)
    : null;
  // The agent.url chain (cosmosAgent?.url) is persisted in the zustand
  // turtleshell-cosmos-agents store and predates any cluster pick — so a
  // logged-in user who picks a cluster still chats against the URL the
  // agent was originally bound to. Apply the cluster override here so
  // ANY URL source retargets to the picked cluster's origin. An explicit
  // options.endpointOverride is respected as-is — caller knows best.
  const rawBaseUrl =
    options?.endpointOverride ||
    cosmosAgent?.url ||
    useEnvironmentStore.getState().getBaseUrl();
  const baseUrl = options?.endpointOverride
    ? rawBaseUrl
    : applyClusterOverride(rawBaseUrl);

  const mcpHeaders = buildMCPHeaders();

  const url = `${baseUrl}/chat`;

  // Build mcpServers array from connected cosmos-logos agents with x-mcp capability
  const allAgents = useCosmosLogosStore.getState().agents;
  const mcpServers: Array<{
    namespace: string;
    url: string;
    manifestUrl: string;
    verified: boolean;
    sealedEnvelope?: string;
  }> = allAgents
    .filter(a => a.capabilities.includes('x-mcp'))
    .map(a => {
      const mcpCap = a.manifest.capabilities.find(c => c.verb === 'x-mcp');
      if (!mcpCap) return null;
      // Same cluster-override rationale as the chat baseUrl above —
      // a.url is whatever was persisted at connect time, but Athena
      // (server-side) needs to reach MCP on the currently-active
      // cluster, not the alpha-org default the agent was first bound
      // to.
      const agentBase = applyClusterOverride(a.url);
      return {
        namespace: a.manifest.identity.codename,
        url: `${agentBase}${mcpCap.path}`,
        manifestUrl: `${agentBase}/.well-known/cosmos-logos.json`,
        verified: true,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Tool bindings — per-agent sealed credentials (Salesforce, etc).
  // The agent receiving this chat request is identified by `options.agentId`
  // when set; otherwise it's the sidebar's active chat agent. Only bindings
  // that belong to THAT agent get sent — Athena's bindings never travel
  // with a Cosmos or Logos chat request. That per-agent isolation is the
  // trust model from the Tools page made real on the wire.
  const dispatchAgentId = options?.agentId || useChatStore.getState().activeAgentId;
  const toolBindings = getToolBindingsForAgent(dispatchAgentId);
  for (const binding of toolBindings) {
    mcpServers.push({
      namespace: binding.toolServerCodename,
      url: binding.mcpUrl,
      manifestUrl: binding.manifestUrl,
      verified: true,
      sealedEnvelope: binding.sealedEnvelope,
    });
  }

  console.log('[ATHENA] Chat request →', baseUrl,
    'MCP:', mcpServers.length > 0 ? `${mcpServers.length} server(s)` : 'none',
    'system_prompt:', options?.systemPrompt ? options.systemPrompt.substring(0, 60) + '...' : '(none)');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: window.location.origin,
    ...mcpHeaders,
    ...(options?.agentId ? { 'x-agent-id': options.agentId } : {}),
  };

  // Same JWT pattern olympus-grid-client.ts uses: read the access token from
  // localStorage and pass it as x-user-identity. This is the production-correct
  // path because cross-origin requests (turtleshell.ai → api-int.turtleshell.ai)
  // can't rely on cookies for auth, even if credentials: 'include' is set.
  // The localStorage token is captured during the verifyCode() flow via the
  // x-token-delivery: header response from Ares.
  const ogToken = localStorage.getItem('og_access_token');
  if (ogToken) headers['x-user-identity'] = ogToken;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      prompt,
      shell_id: getShellId(),
      tenant_id: 'tenant-default',
      ...(options?.agentId ? { agentId: options.agentId } : {}),
      ...(options?.systemPrompt ? { system_prompt: options.systemPrompt } : {}),
      ...(options?.memoryEnabled !== false && conversationId ? { conversationId } : {}),
      ...(options?.memoryEnabled === false ? { memoryEnabled: false } : {}),
      ...(options?.saveConversation ? { saveConversation: true } : {}),
      ...(mcpServers.length > 0 ? { mcpServers } : {}),
    }),
    signal,
  });

  console.log('[ATHENA] Response status:', response.status);
  console.log('[ATHENA] Content-Type:', response.headers.get('content-type'));

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Athena returned ${response.status}: ${body || response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body from Athena');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isSSE = contentType.includes('text/event-stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // If not SSE, yield raw text chunks directly
      if (!isSSE) {
        yield chunk;
        continue;
      }

      // SSE parsing
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEventType = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        // Track SSE event type
        if (trimmed.startsWith('event: ')) {
          currentEventType = trimmed.slice(7).trim();
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') return;

          // Handle metadata events (conversationId, requestId, etc.)
          if (currentEventType === 'metadata') {
            try {
              const meta = JSON.parse(data);
              if (meta.conversationId) {
                yield { conversationId: meta.conversationId };
              }
            } catch { /* ignore malformed metadata */ }
            currentEventType = '';
            continue;
          }
          currentEventType = '';

          // Try structured JSON parse
          try {
            const parsed = JSON.parse(data);

            // Format: { type: "token", content: "..." }
            if (parsed.content) {
              yield parsed.content;
              continue;
            }

            // Format: { type: "error", error: "..." }
            if (parsed.type === 'error') {
              throw new Error(parsed.error ?? 'Stream error');
            }

            // Format: { choices: [{ delta: { content: "..." } }] }
            if (parsed.choices?.[0]?.delta?.content) {
              yield parsed.choices[0].delta.content;
              continue;
            }

            // Format: { text: "..." }
            if (parsed.text) {
              yield parsed.text;
              continue;
            }
          } catch (e) {
            // Re-throw if it's an intentional error from the stream
            if (e instanceof Error && e.message !== 'Stream error' && (e as SyntaxError).name === 'SyntaxError') {
              // Not JSON — yield raw data as text token
              if (data) yield data;
            } else {
              throw e;
            }
          }
        } else {
          // Non-SSE line — try NDJSON
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.content) yield parsed.content;
            else if (parsed.text) yield parsed.text;
          } catch {
            // Ignore unparseable lines
          }
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      const data = buffer.trim();
      if (data.startsWith('data: ')) {
        const payload = data.slice(6).trim();
        if (payload && payload !== '[DONE]') yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
