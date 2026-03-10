/**
 * Build MCP headers for Athena/Poseidon requests.
 *
 * Auth-related headers (x-user-identity, x-github-token, x-google-token,
 * x-hubspot-api-key, authorization) are now injected server-side by
 * Ares cookieToHeader middleware. The browser sends httpOnly cookies
 * automatically via `credentials: 'include'` on every fetch call.
 *
 * Only non-auth headers are constructed here:
 * - x-developer-key (hardcoded app key)
 * - x-agent-id (user's selected agent)
 * - salesforce-url / x-olympus-grid-url (display-only localStorage values)
 * - x-workday-* headers are DEPRECATED here (see migration note below)
 */
export function buildMCPHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Always include developer key
  headers['x-developer-key'] = 'ts-web-int-2026';

  // Selected agent — defaults to turtle (unauth) or athena (auth)
  const selectedAgent = localStorage.getItem('selected_agent') || 'turtle';
  headers['x-agent-id'] = selectedAgent;

  // Salesforce instance URL — non-sensitive display value kept in localStorage
  const sfInstanceUrl = localStorage.getItem('sf_instance_url');
  if (sfInstanceUrl) {
    headers['salesforce-url'] = sfInstanceUrl;
  }

  // Olympus-Grid service URL — non-sensitive display value kept in localStorage
  const ogUrl = localStorage.getItem('olympus_grid_service_url');
  if (ogUrl) {
    headers['x-olympus-grid-url'] = ogUrl;
    // If SF not connected, use OG service URL as salesforce-url
    // so Poseidon can still route to Olympus-Grid Apex REST tools
    if (!headers['salesforce-url']) {
      headers['salesforce-url'] = ogUrl;
    }
  }

  // Workday — DEPRECATED: localStorage credential storage disabled.
  // Migration path: pack {user, password, endpoint} into a single
  // __Host-wd_creds httpOnly cookie (base64 JSON). Ares decodes and
  // fans out to x-workday-user, x-workday-password, x-workday-endpoint
  // headers via cookieToHeader middleware. Service is marked coming_soon
  // in SERVICE_CATALOG until a proper test environment is available.

  console.log(
    '[MCP] Headers built — active:',
    Object.keys(headers).filter((k) => k !== 'x-developer-key'),
  );

  return headers;
}
