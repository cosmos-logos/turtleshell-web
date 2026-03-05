import { useEnvironmentStore } from '@/lib/store/environment-store';
import { buildMCPHeaders } from '@/lib/athena/mcp-headers';

/**
 * Initialize a Poseidon MCP session via the JSON-RPC handshake.
 *
 * Poseidon requires a 3-step initialization before tools can be called:
 * 1. `initialize` — negotiate protocol version and capabilities
 * 2. `notifications/initialized` — signal readiness (fire-and-forget, 202)
 * 3. `tools/list` — discover available tools (logged for debugging)
 *
 * This should be called once per app load after token refresh settles,
 * only when at least one service is connected.
 */
export async function initializePoseidonSession(): Promise<void> {
  const mcpHeaders = buildMCPHeaders();

  // Only x-developer-key means no services connected — skip
  const activeKeys = Object.keys(mcpHeaders).filter((k) => k !== 'x-developer-key');
  if (activeKeys.length === 0) {
    console.log('[MCP] No services connected, skipping Poseidon init');
    return;
  }

  const poseidonUrl = useEnvironmentStore.getState().getPoseidonMcpUrl();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    ...mcpHeaders,
  };

  console.log('[MCP] Initializing Poseidon session at:', poseidonUrl);

  // Step 1: initialize
  const initRes = await fetch(poseidonUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'turtleshell-web', version: '0.1.0' },
      },
    }),
  });
  const initData = await initRes.json().catch(() => null);
  console.log('[MCP] initialize:', initRes.status, initData);

  if (!initRes.ok) {
    throw new Error(`Poseidon initialize failed: ${initRes.status}`);
  }

  // Step 2: notifications/initialized (fire-and-forget, expects 202)
  await fetch(poseidonUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });
  console.log('[MCP] notifications/initialized sent');

  // Step 3: tools/list — log available tools for debugging
  const toolsRes = await fetch(poseidonUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
      params: {},
    }),
  });
  const toolsData = await toolsRes.json().catch(() => null);
  const toolNames = toolsData?.result?.tools?.map((t: { name: string }) => t.name) ?? [];
  console.log(`[MCP] tools/list: ${toolNames.length} tools available:`, toolNames);
}
