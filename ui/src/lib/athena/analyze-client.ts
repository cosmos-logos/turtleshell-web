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

  console.log('[ATHENA] Analyze →', baseUrl, req.mediaType, `${(req.data.length / 1024).toFixed(1)} KB b64`);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    signal,
    body: JSON.stringify(req),
  });

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
