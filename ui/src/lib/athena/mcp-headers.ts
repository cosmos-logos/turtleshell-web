import type { ServiceCredentials } from '@/types/service';

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
  if (!credentials) return {};

  const headers: Record<string, string> = {};

  if (credentials.accessToken) {
    headers['Authorization'] = `Bearer ${credentials.accessToken}`;
  }

  if (credentials.instanceUrl) {
    headers['salesforce-url'] = credentials.instanceUrl;
  }

  return headers;
}
