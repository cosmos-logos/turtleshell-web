import { useEnvironmentStore, applyClusterOverride } from '@/lib/store/environment-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { buildMCPHeaders } from './mcp-headers';
import type { AnalyzeMediaType } from '@/lib/media/media-router';

export interface AnalyzeRequest {
  data: string;
  mediaType: AnalyzeMediaType;
  maxPages?: number;
  instruction?: string;
}

export interface AnalyzeResult {
  content_type: string;
  summary: string;
  text: string;
  extracted?: Record<string, unknown>;
  entities?: Record<string, unknown>;
  proposed_action?: Record<string, unknown>;
  confidence?: number;
  needs_clarification?: string;
}

export interface AnalyzeResponse {
  ok: boolean;
  provider: string;
  model: string;
  ms: number;
  key_source: string;
  key_label: string;
  result: AnalyzeResult;
  pdf_pages?: { total: number; rendered: number; truncated: boolean };
  error?: string;
}

// Wall-clock cap for a single /analyze call. Athena's upstream provider
// timeouts can be 5 min, but the SSL/TLS handshake to OpenAI occasionally
// hangs without ever returning (we saw an SSL "bad record mac" silently
// stall mid-flight earlier in EOS-5 testing). 90s is long enough for the
// slow-but-completing PDF + Claude path, short enough that one stuck blob
// doesn't lock the whole multi-attachment submit.
const ANALYZE_TIMEOUT_MS = 90_000;

// POST /v1/athena/analyze — runtime-plane (Pantheon cluster), mirrors
// streamChat's URL/auth chain so the same cluster pick + JWT route both calls.
export async function analyzeFile(
  req: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const activeChatAgentId = useCosmosLogosStore.getState().activeChatAgentId;
  const cosmosAgent = activeChatAgentId
    ? useCosmosLogosStore.getState().agents.find(a => a.id === activeChatAgentId)
    : null;
  const rawBaseUrl = cosmosAgent?.url || useEnvironmentStore.getState().getBaseUrl();
  const baseUrl = applyClusterOverride(rawBaseUrl);
  const url = `${baseUrl}/analyze`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: window.location.origin,
    ...buildMCPHeaders(),
  };
  const ogToken = localStorage.getItem('og_access_token');
  if (ogToken) headers['x-user-identity'] = ogToken;

  // Compose the caller's signal (if any) with our timeout so either one
  // aborts the fetch. AbortSignal.any (Chrome 116+) is cleanest; we fall
  // back to a manual relay for older runtimes.
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(new Error('timeout')), ANALYZE_TIMEOUT_MS);
  const composedSignal: AbortSignal = (typeof (AbortSignal as any).any === 'function' && signal)
    ? (AbortSignal as any).any([signal, timeoutCtrl.signal])
    : timeoutCtrl.signal;
  if (signal && composedSignal === timeoutCtrl.signal) {
    signal.addEventListener('abort', () => timeoutCtrl.abort(signal.reason), { once: true });
  }

  console.log('[ATHENA] Analyze →', baseUrl, req.mediaType, `${(req.data.length / 1024).toFixed(1)} KB b64`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      signal: composedSignal,
      body: JSON.stringify(req),
    });
  } catch (e) {
    clearTimeout(timer);
    // Differentiate "we timed out" from "user aborted" from "network died"
    if ((e as Error).name === 'AbortError' || (e as DOMException).name === 'AbortError') {
      const reason = (timeoutCtrl.signal.aborted && (timeoutCtrl.signal.reason as Error)?.message === 'timeout')
        ? `Analyze timed out after ${ANALYZE_TIMEOUT_MS / 1000}s — the upstream may be hung; retry or remove`
        : 'Analyze cancelled';
      throw new Error(reason);
    }
    throw e;
  }
  clearTimeout(timer);

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Athena analyze returned ${response.status}: ${body || response.statusText}`);
  }

  const json = (await response.json()) as AnalyzeResponse;
  if (json.ok === false) {
    throw new Error(json.error || `Provider ${json.provider} failed on ${req.mediaType}`);
  }
  return json;
}
