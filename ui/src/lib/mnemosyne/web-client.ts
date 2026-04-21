// ui/src/lib/mnemosyne/web-client.ts
//
// Web-side Mnemosyne client, used by BYOK chat turns (openai / claude / grok /
// gemini) to persist conversation history + extracted facts without routing
// the actual LLM call through Athena. BYOK keeps the user's API key in the
// browser; Mnemosyne still records the turn so the History and Memory pages
// work and scope per-BYOK-agent, exactly like cosmos-logos agents do.
//
// Athena's own chat pipeline already calls Mnemosyne server-side (see
// athena/api/src/lib/mnemosyne-client.ts), so this module only runs for
// direct-to-vendor BYOK turns. For cosmos/logos/athena, Chat.tsx sends
// through streamChat → Athena → Mnemosyne and this code path stays idle.

import { useEnvironmentStore } from '@/lib/store/environment-store';

interface MnemosyneTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

function getMnemosyneBase(): string {
  return `${useEnvironmentStore.getState().getGatewayUrl()}/v1/mnemosyne/api`;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('og_access_token');
  if (token) headers['x-user-identity'] = token;
  return headers;
}

/** Create a conversation. Returns its id, or null on failure (fire-and-forget). */
export async function createConversation(shellId?: string): Promise<string | null> {
  try {
    const resp = await fetch(`${getMnemosyneBase()}/conversation`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ shellId: shellId || undefined }),
    });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    return data?.id ?? data?.result?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Append user + assistant turns to a conversation. Fire-and-forget — failures
 * should never block the UI. Stamps `agentId` so History filters correctly.
 */
export async function appendTurns(
  conversationId: string,
  turns: MnemosyneTurn[],
  agentId: string,
  saveConversation: boolean = true,
): Promise<void> {
  try {
    await fetch(`${getMnemosyneBase()}/conversation/${encodeURIComponent(conversationId)}/turns`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ turns, saveConversation, agentId }),
    });
  } catch {
    // swallow — history persistence must never break chat UX
  }
}

/**
 * Save a single memory key/value. Mirrors Athena's server-side extractor
 * (`my X is Y`) so BYOK users get the same "name: Greg" facts that Athena
 * agents get automatically. The Memory page filters by `agentId`, so facts
 * picked up during a BYOK-OpenAI turn show up under the OpenAI scope.
 */
export async function saveMemory(
  key: string,
  value: string,
  agentId: string,
): Promise<void> {
  try {
    await fetch(`${getMnemosyneBase()}/memory`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ key, value, agentId }),
    });
  } catch {
    // swallow
  }
}

/**
 * Same first-fact regex Athena uses server-side (`\bmy\s+([a-z…])\s+(?:is|are)\s+…`).
 * Keeping the pattern identical means a user's "my name is Greg" memory surfaces
 * whether they chatted via Athena, Cosmos, Logos, or any BYOK provider.
 */
const FACT_RE = /\bmy\s+([a-z][a-z_ ]{1,40}?)\s+(?:is|are)\s+([^.!?\n]{1,200})/i;

export function extractFactFromPrompt(prompt: string): { key: string; value: string } | null {
  const m = prompt.match(FACT_RE);
  if (!m || !m[1] || !m[2]) return null;
  const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
  const value = m[2].trim();
  return { key, value };
}
