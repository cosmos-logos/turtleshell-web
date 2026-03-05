/**
 * Build MCP headers for Athena/Poseidon requests.
 *
 * Reads credentials directly from localStorage so we always
 * send the latest tokens without depending on Zustand hydration.
 *
 * Headers are consumed by Athena (forwarded to Poseidon) and
 * by Poseidon directly for tool execution.
 */
export function buildMCPHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Always include developer key
  headers['x-developer-key'] = 'ts-web-int-2026';

  // Salesforce — only if connected
  const sfToken = localStorage.getItem('sf_access_token');
  const sfInstanceUrl = localStorage.getItem('sf_instance_url');
  if (sfToken && sfInstanceUrl) {
    headers['authorization'] = `Bearer ${sfToken}`;
    headers['salesforce-url'] = sfInstanceUrl;
  }

  // Olympus-Grid — only if connected
  const ogToken = localStorage.getItem('olympus_grid_access_token');
  const ogUrl = localStorage.getItem('olympus_grid_service_url');
  if (ogToken && ogUrl) {
    headers['x-user-identity'] = ogToken;
    headers['x-olympus-grid-url'] = ogUrl;
    // If SF not connected, use OG service URL as salesforce-url
    // so Poseidon can still route to Olympus-Grid Apex REST tools
    if (!headers['salesforce-url']) {
      headers['salesforce-url'] = ogUrl;
    }
  }

  // GitHub — only if connected
  const ghToken = localStorage.getItem('gh_access_token');
  if (ghToken) {
    headers['x-github-token'] = ghToken;
  }

  // Google — only if connected
  const googleToken = localStorage.getItem('google_access_token');
  if (googleToken) {
    headers['x-google-token'] = googleToken;
  }

  // HubSpot — only if connected
  const hsToken = localStorage.getItem('hs_access_token');
  if (hsToken) {
    headers['x-hubspot-api-key'] = hsToken;
  }

  // Workday — only if connected (3 headers: user, password, endpoint)
  const wdUsername = localStorage.getItem('wd_username');
  const wdPassword = localStorage.getItem('wd_password');
  const wdEndpoint = localStorage.getItem('wd_endpoint_url');
  if (wdUsername && wdPassword && wdEndpoint) {
    headers['x-workday-user'] = wdUsername;
    headers['x-workday-password'] = wdPassword;
    headers['x-workday-endpoint'] = wdEndpoint;
  }

  console.log(
    '[MCP] Headers built — active:',
    Object.keys(headers).filter((k) => k !== 'x-developer-key'),
  );

  return headers;
}
