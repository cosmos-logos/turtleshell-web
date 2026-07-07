// src/lib/sovereign-ai/provider-catalog.ts
//
// Hardcoded chat + voice provider catalog. Structural mirror of omens'
// ProviderCatalog.cs. Every entry declares what the sovereign envelope
// needs (key vs endpoint), the current-generation default model that
// should be sent through the envelope (server-side falls back if omitted),
// and a display name + tagline for the picker UI.
//
// Load-bearing invariants (per sovereign-ai-seam-cross-surface-reference.md §9):
//   - Every provider row is a VISUAL PEER — no pedestal for olympus-grid.
//   - Default models MUST track the server's Athena/Apollo defaults. When
//     a provider retires a model (Grok: grok-2→grok-4; Gemini: 1.5→2.5),
//     bump this file in the same PR that bumps the server-side default.
//   - Adding a provider row without a matching Athena/Apollo adapter will
//     make the row selectable but 404 at chat time. Coordinate cross-repo.

export type SovereignCategory = 'chat' | 'voice';

export interface SovereignProvider {
  key: string;                    // wire identifier — MUST match server allowlist
  displayName: string;
  tagline: string;
  requiresKey: boolean;
  requiresEndpoint: boolean;
  defaultEndpointUrl: string | null;
  defaultModel: string;
}

/** Chat providers — matches athena/api/src/ai/sovereign-envelope.ts allowlist. */
export const CHAT_PROVIDERS: readonly SovereignProvider[] = [
  {
    key: 'olympus-grid',
    displayName: 'Olympus-Grid',
    tagline: 'Free with your account.',
    requiresKey: false,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'auto',
  },
  {
    key: 'openai',
    displayName: 'OpenAI',
    tagline: 'You bring the key.',
    requiresKey: true,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'gpt-4o-mini',
  },
  {
    key: 'anthropic',
    displayName: 'Anthropic',
    tagline: 'You bring the key.',
    requiresKey: true,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'claude-sonnet-4-5',
  },
  {
    key: 'grok',
    displayName: 'Grok',
    tagline: 'You bring the key.',
    requiresKey: true,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'grok-4',
  },
  {
    key: 'gemini',
    displayName: 'Gemini',
    tagline: 'You bring the key.',
    requiresKey: true,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'gemini-2.5-flash',
  },
  {
    key: 'ollama',
    displayName: 'Ollama',
    tagline: 'You host it.',
    requiresKey: false,
    requiresEndpoint: true,
    defaultEndpointUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
  },
] as const;

/** Voice providers — matches apollo/api/src/audio/sovereign-envelope.ts allowlist. */
export const VOICE_PROVIDERS: readonly SovereignProvider[] = [
  {
    key: 'olympus-grid',
    displayName: 'Olympus-Grid',
    tagline: 'Free with your account.',
    requiresKey: false,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'auto',
  },
  {
    key: 'openai',
    displayName: 'OpenAI TTS',
    tagline: 'You bring the key.',
    requiresKey: true,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'gpt-4o-mini-tts',
  },
  {
    key: 'elevenlabs',
    displayName: 'ElevenLabs',
    tagline: 'You bring the key.',
    requiresKey: true,
    requiresEndpoint: false,
    defaultEndpointUrl: null,
    defaultModel: 'eleven_multilingual_v2',
  },
  {
    key: 'xtts',
    displayName: 'XTTS',
    tagline: 'You host it.',
    requiresKey: false,
    requiresEndpoint: true,
    defaultEndpointUrl: 'http://localhost:8001',
    defaultModel: 'xtts_v2',
  },
] as const;

export function providersFor(category: SovereignCategory): readonly SovereignProvider[] {
  return category === 'chat' ? CHAT_PROVIDERS : VOICE_PROVIDERS;
}

export function chatProviderByKey(key: string | null | undefined): SovereignProvider | null {
  if (!key) return null;
  return CHAT_PROVIDERS.find((p) => p.key === key) ?? null;
}

export function voiceProviderByKey(key: string | null | undefined): SovereignProvider | null {
  if (!key) return null;
  return VOICE_PROVIDERS.find((p) => p.key === key) ?? null;
}
