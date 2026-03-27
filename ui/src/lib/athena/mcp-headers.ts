/**
 * Build MCP headers for Athena/Poseidon requests.
 *
 * Dynamically resolves the MCP server URL from connected cosmos-logos agents
 * that declare the `x-mcp` capability. If Poseidon (or any MCP-capable agent)
 * is connected, its endpoint is passed to Athena via x-mcp-server-url header.
 * If no MCP agent is connected, no MCP tools are available.
 */
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';

export function buildMCPHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Always include developer key
  headers['x-developer-key'] = 'ts-web-int-2026';

  // Selected agent — defaults to turtle (unauth) or athena (auth)
  const selectedAgent = localStorage.getItem('selected_agent') || 'turtle';
  headers['x-agent-id'] = selectedAgent;

  // Discover MCP server from connected cosmos-logos agents
  const cosmosAgents = useCosmosLogosStore.getState().agents;
  const mcpAgent = cosmosAgents.find(a =>
    a.capabilities.includes('x-mcp')
  );
  if (mcpAgent) {
    const mcpCap = mcpAgent.manifest.capabilities.find(c => c.verb === 'x-mcp');
    if (mcpCap) {
      const mcpUrl = `${mcpAgent.url}${mcpCap.path}`;
      headers['x-mcp-server-url'] = mcpUrl;
      console.log('[MCP] Discovered MCP server from cosmos-logos:', mcpAgent.manifest.identity.name, mcpUrl);
    }
  }

  // Salesforce instance URL — non-sensitive display value kept in localStorage
  const sfInstanceUrl = localStorage.getItem('sf_instance_url');
  if (sfInstanceUrl) {
    headers['salesforce-url'] = sfInstanceUrl;
  }

  // Olympus-Grid service URL
  const ogUrl = localStorage.getItem('olympus_grid_service_url');
  if (ogUrl) {
    headers['x-olympus-grid-url'] = ogUrl;
    if (!headers['salesforce-url']) {
      headers['salesforce-url'] = ogUrl;
    }
  }

  console.log(
    '[MCP] Headers built — active:',
    Object.keys(headers).filter((k) => k !== 'x-developer-key'),
  );

  return headers;
}
