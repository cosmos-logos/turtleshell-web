/**
 * Direct LLM provider clients — call vendor APIs from the browser.
 * No Athena, no Olympus Grid. Just your API key + the vendor.
 *
 * Each provider streams SSE responses in its own format.
 * All are normalized to yield string tokens.
 */

import { getUserApiKeys } from '@/lib/store/agent-store';

interface ChatOptions {
  systemPrompt?: string;
  conversationHistory?: { role: string; content: string }[];
}

// ── OpenAI ────────────────────────────────────────────────────

async function* streamOpenAI(prompt: string, signal?: AbortSignal, opts?: ChatOptions): AsyncGenerator<string> {
  const key = getUserApiKeys().openai;
  if (!key) throw new Error('OpenAI API key not configured');

  const messages: { role: string; content: string }[] = [];
  if (opts?.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
  if (opts?.conversationHistory) messages.push(...opts.conversationHistory);
  messages.push({ role: 'user', content: prompt });

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o', messages, stream: true }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${err}`);
  }

  yield* parseSSE(resp, (data) => {
    try {
      const parsed = JSON.parse(data);
      return parsed.choices?.[0]?.delta?.content || '';
    } catch { return ''; }
  });
}

// ── Claude (Anthropic) ───────────────────────────────────────

async function* streamClaude(prompt: string, signal?: AbortSignal, opts?: ChatOptions): AsyncGenerator<string> {
  const key = getUserApiKeys().claude;
  if (!key) throw new Error('Claude API key not configured');

  const messages: { role: string; content: string }[] = [];
  if (opts?.conversationHistory) messages.push(...opts.conversationHistory);
  messages.push({ role: 'user', content: prompt });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: opts?.systemPrompt || undefined,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude error ${resp.status}: ${err}`);
  }

  yield* parseSSE(resp, (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'content_block_delta') return parsed.delta?.text || '';
      return '';
    } catch { return ''; }
  });
}

// ── Grok (xAI) ───────────────────────────────────────────────

async function* streamGrok(prompt: string, signal?: AbortSignal, opts?: ChatOptions): AsyncGenerator<string> {
  const key = getUserApiKeys().grok;
  if (!key) throw new Error('Grok API key not configured');

  const messages: { role: string; content: string }[] = [];
  if (opts?.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
  if (opts?.conversationHistory) messages.push(...opts.conversationHistory);
  messages.push({ role: 'user', content: prompt });

  const resp = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'grok-3-mini', messages, stream: true }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Grok error ${resp.status}: ${err}`);
  }

  yield* parseSSE(resp, (data) => {
    try {
      const parsed = JSON.parse(data);
      return parsed.choices?.[0]?.delta?.content || '';
    } catch { return ''; }
  });
}

// ── Gemini (Google) ──────────────────────────────────────────

async function* streamGemini(prompt: string, signal?: AbortSignal, opts?: ChatOptions): AsyncGenerator<string> {
  const key = getUserApiKeys().gemini;
  if (!key) throw new Error('Gemini API key not configured');

  const contents: any[] = [];
  if (opts?.conversationHistory) {
    for (const msg of opts.conversationHistory) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const body: any = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  };
  if (opts?.systemPrompt) {
    body.system_instruction = { parts: [{ text: opts.systemPrompt }] };
  }

  // Gemini uses a different streaming format (SSE with generateContent)
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${err}`);
  }

  yield* parseSSE(resp, (data) => {
    try {
      const parsed = JSON.parse(data);
      return parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch { return ''; }
  });
}

// ── SSE Parser ────────────────────────────────────────────────

async function* parseSSE(resp: Response, extractContent: (data: string) => string): AsyncGenerator<string> {
  if (!resp.body) return;
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') return;
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          const content = extractContent(data);
          if (content) yield content;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Router ────────────────────────────────────────────────────

const PROVIDERS: Record<string, typeof streamOpenAI> = {
  openai: streamOpenAI,
  claude: streamClaude,
  grok: streamGrok,
  gemini: streamGemini,
};

/**
 * Stream a chat message directly to a vendor LLM.
 * No Athena, no proxy. Just your API key + the vendor API.
 */
export async function* streamDirect(
  providerId: string,
  prompt: string,
  signal?: AbortSignal,
  opts?: ChatOptions,
): AsyncGenerator<string> {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  yield* provider(prompt, signal, opts);
}

/** Check if a provider ID has a direct client available */
export function hasDirectProvider(id: string): boolean {
  return id in PROVIDERS;
}
