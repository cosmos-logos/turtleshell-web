import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useServiceStore } from '@/lib/store/service-store';
import { buildMCPHeaders } from './mcp-headers';

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
): AsyncGenerator<string, void, unknown> {
  const baseUrl = useEnvironmentStore.getState().getBaseUrl();
  const crmService = useServiceStore.getState().activeService('crm');

  const url = `${baseUrl}/chat`;
  console.log('🐢 [Athena] Connecting to:', url);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: window.location.origin,
    ...buildMCPHeaders(crmService?.credentials),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt }),
    signal,
  });

  console.log('🐢 [Athena] Response status:', response.status);
  console.log('🐢 [Athena] Content-Type:', response.headers.get('content-type'));

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

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') return;

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
