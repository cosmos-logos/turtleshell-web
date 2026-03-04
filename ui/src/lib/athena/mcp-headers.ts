import type { ServiceCredentials } from '@/types/service';
import { useServiceStore } from '@/lib/store/service-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';

/**
 * Build MCP headers for Athena requests.
 * These headers allow the LLM backend to interact with
 * connected enterprise services on behalf of the user.
 *
 * Mirrors iOS ChatService MCP header construction.
 */
export function buildMCPHeaders(
  credentials?: ServiceCredentials,
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (credentials?.accessToken) {
    headers['Authorization'] = `Bearer ${credentials.accessToken}`;
  }

  if (credentials?.instanceUrl) {
    headers['salesforce-url'] = credentials.instanceUrl;
  }

  // Olympus-Grid gateway fallback for MCP routing
  if (!headers['salesforce-url'] && useServiceStore.getState().isOlympusGridConnected()) {
    headers['salesforce-url'] = useEnvironmentStore.getState().getGatewayUrl();
  }

  return headers;
}
