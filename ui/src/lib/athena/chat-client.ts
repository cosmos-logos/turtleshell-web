import { useEnvironmentStore, applyClusterOverride } from '@/lib/store/environment-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { buildMCPHeaders } from './mcp-headers';
import { getShellId } from '@/lib/api/olympus-grid-client';
import { useChatStore } from '@/lib/store/chat-store';
import { getToolBindingsForAgent } from '@/lib/store/tool-bindings-store';
import { sealForWire } from '@/lib/sovereign-ai/envelope';
import { loadSlot, deleteSlot } from '@/lib/sovereign-ai/secure-storage';
import { useSovereignAiStore } from '@/lib/store/sovereign-ai-store';

/** Sovereign AI intent — attached to the chat request when the user has picked
 *  a non-Olympus-Grid chat provider. The client's BYOK material never crosses
 *  this boundary as plaintext; only the provider name + client surface hint
 *  do. streamChat loads the previously-sealed inner ciphertext from
 *  IndexedDB, wraps it in a fresh outer envelope, and seals the outer
 *  against Athena's current pubkey. See src/lib/sovereign-ai/envelope.ts and
 *  olympus-616/docs/sovereign-ai-seam-cross-surface-reference.md §3.
 *
 *  Steward directive 2026-07-07: no plaintext BYOK material anywhere.
 *  The old byokKey / byokEndpoint / byokModel fields are REMOVED. */
export interface SovereignAIIntent {
  chatProvider: string;        // openai | anthropic | grok | gemini | ollama
  clientSurface: string;       // "turtleshell-web"
}

/** Provenance frame — server emits after a sovereign turn as an SSE
 *  `event: provenance` frame. Callers surface it via the metadata yield
 *  (same union as conversationId) so Chat.tsx can render the Powered-by
 *  chip below the assistant bubble. */
export interface ChatProvenance {
  chatProvider: string;
  chatModel: string;
  byokUsed: boolean;
  endpointClass: string;
  clientSurface: string | null;
  tithed: boolean;
  infrastructureShells: number;
  turnCorrelationId: string;
  tokensIn: number;
  tokensOut: number;
  turnDurationMs: number;
}

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
  options?: { memoryEnabled?: boolean; saveConversation?: boolean; systemPrompt?: string; agentId?: string; endpointOverride?: string; sovereignAI?: SovereignAIIntent | null },
): AsyncGenerator<string | { conversationId: string } | { provenance: ChatProvenance }, void, unknown> {
  // Resolve base URL: explicit endpoint > connected cosmos agent > environment preset
  const activeChatAgentId = useCosmosLogosStore.getState().activeChatAgentId;
  const cosmosAgent = activeChatAgentId
    ? useCosmosLogosStore.getState().agents.find(a => a.id === activeChatAgentId)
    : null;
  // The agent.url chain (cosmosAgent?.url, builtin agent endpoint,
  // PublicProfile owner endpoint) is captured-at-bind time and predates
  // any cluster pick. The cluster override is the user's *explicit*
  // routing choice and ALWAYS wins — including when callers pass an
  // endpointOverride, because every caller in the codebase resolves
  // endpointOverride from an agent URL that doesn't know about clusters.
  // applyClusterOverride is idempotent: when the URL already starts
  // with the cluster origin (or no cluster is picked) it's a no-op.
  const rawBaseUrl =
    options?.endpointOverride ||
    cosmosAgent?.url ||
    useEnvironmentStore.getState().getBaseUrl();
  const baseUrl = applyClusterOverride(rawBaseUrl);

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

  // ── EOS-5.4 Sovereign AI v2 ── Load the previously-sealed inner
  // ciphertext from IndexedDB, wrap it in a fresh outer envelope, seal
  // that outer against Athena's current pubkey.
  //
  // The plaintext BYOK NEVER exists on the client — it was sealed once at
  // paste time by ProviderChooser (via sealForStorage), stored as bytes,
  // and cannot be decrypted by the client (crypto_box_seal uses ephemeral
  // sender keys). Only Athena's private key can open the inner. Ares and
  // Hermes pass everything through opaque.
  //
  // When sovereignAI is absent or chatProvider === 'olympus-grid', we take
  // the house path and skip the seal — the request lands on the same
  // /chat endpoint but with no sovereignAI block, and Athena falls back
  // to its server-side key resolution + emits a provenance frame carrying
  // byokUsed=false, tithed=true, so the client can still render the chip.
  let sovereignBlock: {
    chatProvider: string;
    sealedEnvelope: string;
    envelopeFormat: string;
    envelopeVersion: string;
    manifestUrl: string;
  } | null = null;
  if (options?.sovereignAI && options.sovereignAI.chatProvider !== 'olympus-grid') {
    const provider = options.sovereignAI.chatProvider;
    const slot = await loadSlot('chat', provider);
    if (!slot) {
      throw new Error(
        `Sovereign AI: no sealed key stored for ${provider}. Open Settings → Sovereign AI to add one.`,
      );
    }
    try {
      const manifestUrl = `${baseUrl}/.well-known/cosmos-logos.json`;
      const sealed = await sealForWire(
        manifestUrl,
        slot.storedInner,
        options.sovereignAI.clientSurface,
      );
      sovereignBlock = {
        chatProvider: provider,
        sealedEnvelope: sealed.sealedEnvelopeBase64,
        envelopeFormat: sealed.envelopeFormat,
        envelopeVersion: sealed.envelopeVersion,
        manifestUrl: sealed.manifestUrl,
      };
      console.log('[ATHENA] sovereignAI v2 wrapped', {
        provider,
        godRecipient: slot.godRecipient,
        storageFp: slot.manifestFingerprint.slice(0, 20),
        currentFp: sealed.manifestFingerprint.slice(0, 20),
      });
    } catch (err) {
      // Fail-safe: if the seal fails, refuse to fall through to the house
      // path (which would billing-mislead the user). Surface as a chat
      // error so the UI shows what happened.
      throw new Error(`Failed to seal Sovereign AI envelope: ${(err as Error).message}`);
    }
  }

  console.log('[ATHENA] Chat request →', baseUrl,
    'MCP:', mcpServers.length > 0 ? `${mcpServers.length} server(s)` : 'none',
    'sovereignAI:', sovereignBlock ? sovereignBlock.chatProvider : '(none)',
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
      // EOS-5.4 sovereign envelope — attach the sealed block when present.
      // Ares + Hermes pass it through untouched; only Athena decrypts.
      ...(sovereignBlock ? { sovereignAI: sovereignBlock } : {}),
    }),
    signal,
  });

  console.log('[ATHENA] Response status:', response.status);
  console.log('[ATHENA] Content-Type:', response.headers.get('content-type'));

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    // ── Rotation kill-switch ── If Athena returns envelope_storage_stale
    // it means the god private key rotated since we sealed the storedInner
    // (or the seed IDB blob got mangled). Wipe the slot + slot metadata
    // so the user re-enters through the ceremony next time. Steward's
    // 2026-07-07 "rotation kills stored keys" property landing on the wire.
    if (
      options?.sovereignAI &&
      options.sovereignAI.chatProvider !== 'olympus-grid' &&
      body.includes('envelope_storage_stale')
    ) {
      const provider = options.sovereignAI.chatProvider;
      try {
        await deleteSlot('chat', provider);
      } catch { /* swallow — the store cleanup below is what matters for UI */ }
      useSovereignAiStore.getState().clearChatSlot(provider);
      throw new Error(
        `Athena's cosmos-logos key rotated — your saved ${provider} key was invalidated. Re-enter it in Settings → Sovereign AI.`,
      );
    }
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
          // EOS-5.4 provenance frame — server emits ONE per turn just before
          // [DONE]. Contains the honest attribution the Powered-by chip
          // renders. Yield as a metadata object so Chat.tsx can peel it off
          // the token stream via a typeof===object check.
          if (currentEventType === 'provenance') {
            try {
              const prov = JSON.parse(data);
              yield {
                provenance: {
                  chatProvider:         String(prov.chatProvider ?? 'unknown'),
                  chatModel:            String(prov.chatModel ?? 'unknown'),
                  byokUsed:             prov.byokUsed === true,
                  endpointClass:        String(prov.endpointClass ?? 'managed-cloud'),
                  clientSurface:        prov.clientSurface != null ? String(prov.clientSurface) : null,
                  tithed:               prov.tithed === true,
                  infrastructureShells: Number(prov.infrastructureShells ?? 1),
                  turnCorrelationId:    String(prov.turnCorrelationId ?? ''),
                  tokensIn:             Number(prov.tokensIn ?? 0),
                  tokensOut:            Number(prov.tokensOut ?? 0),
                  turnDurationMs:       Number(prov.turnDurationMs ?? 0),
                },
              };
            } catch { /* malformed provenance is non-fatal */ }
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
