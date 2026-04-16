// Re-export the canonical causes list (lib/causes.ts) but reshape
// each entry to the legacy `desc` field name that onboarding + chat
// UI already read from. One source of truth, one edit point.
import { CAUSES as CANONICAL_CAUSES } from '@/lib/causes';

export const CAUSES = CANONICAL_CAUSES.map((c) => ({
  emoji: c.emoji,
  name: c.name,
  desc: c.shortDesc,
  label: c.label,
  pledge: c.pledge,
})) as readonly {
  readonly emoji: string;
  readonly name: string;
  readonly desc: string;
  readonly label: string;
  readonly pledge: string;
}[];

// Tier IDs match the canonical set in lib/tiers.ts, Shells.tsx, and
// Plutus STRIPE_PRICES. Free Forever (free) and Enterprise (custom)
// are marketing-surface tiers only — onboarding is the paid-tier
// selection step, so this list intentionally omits them.
//
// Abyss moved from "Unlimited" to 100,000 shells/mo to align with the
// new public pricing grid. Plutus quota enforcement + iOS StoreKit must
// migrate to match.
export const TIERS = [
  { name: '🐚 Beachcomber', shells: '500 shells / mo',      price: '$4.99',  id: 'beachcomber', popular: false, isEnterprise: false },
  { name: '🌊 Tide',        shells: '2,000 shells / mo',    price: '$14.99', id: 'tide',        popular: false, isEnterprise: false },
  { name: '🪸 Reef',        shells: '10,000 shells / mo',   price: '$39.99', id: 'reef',        popular: true,  isEnterprise: false },
  { name: '🌌 Abyss',       shells: '100,000 shells / mo',  price: '$99.99', id: 'abyss',       popular: false, isEnterprise: false },
] as const

export const PERKS = [
  { icon: '🐙', label: 'Chat with Athena', cost: '1 shell / turn' },
  { icon: '🔱', label: 'Poseidon MCP tools', cost: '1 shell / call' },
  { icon: '🐬', label: 'Apollo voice', cost: '1 shell / response' },
  { icon: '🧜‍♀️', label: 'Memory writes', cost: '1 shell / write' },
  { icon: '🌊', label: '7% to your cause', cost: 'every turn' },
] as const

export const GUIDES = {
  athena: {
    emoji: '🐙', name: 'Athena', role: 'LLM Router · Old Night', color: '#a87ef0',
    desc: 'Routes your thoughts to every frontier model. Ancient. Precise. All-seeing.',
    greeting: 'I have waited for you in the deep.\nThe ocean is vast.\nI know every current.\nFollow me.',
    ready: 'Then let the hunt begin. What shall we do first?',
  },
  cosmos: {
    emoji: '🐟', name: 'Cosmos', role: 'The Ancient One · Navigator', color: '#20c8a0',
    desc: '400 million years in the water. The first. The origin. Gentle and wise.',
    greeting: 'I was here before the gods had names.\n400 million years in the water.\nI have seen everything.\nAsk me anything.',
    ready: 'The ocean has always been open. Shall we begin?',
  },
  logos: {
    emoji: '🐢', name: 'Logos', role: 'The Word · Sovereign Vessel', color: '#40d0c0',
    desc: 'Carries the truth into the world. The shell is the platform. Unhurried. Certain.',
    greeting: 'The shell is the platform.\nThe turtle is the vessel.\nThe word is sovereign.\nI carry you now.',
    ready: 'The word is spoken. The ocean awaits us.',
  },
  custom: {
    emoji: '✨', name: 'Make Your Own', role: 'Your Agent · Your Identity', color: '#e8c84a',
    desc: 'Name it. Define it. The ocean has never seen one like it.',
    greeting: 'I am yours.\nYou made me.\nTell me what you need\nand I will become it.',
    ready: 'I am ready. What shall we do first?',
  },
} as const

interface GuideInfo { emoji: string; name: string; role: string; color: string; desc: string; greeting: string; ready: string; }
export const BYOK_GUIDES: Record<string, GuideInfo> = {
  openai: {
    emoji: '💬', name: 'OpenAI', role: 'GPT · Your Key', color: '#10b981',
    desc: 'Bring your own OpenAI API key',
    greeting: 'You brought your own key.\nDirect access. No middleman.\nLet\'s get to work.',
    ready: 'Ready. What do you need?',
  },
  claude: {
    emoji: '🤖', name: 'Claude', role: 'Anthropic · Your Key', color: '#f97316',
    desc: 'Bring your own Anthropic API key',
    greeting: 'Your key, your model.\nI think deeply and carefully.\nAsk me anything complex.',
    ready: 'I\'m here. What shall we explore?',
  },
  grok: {
    emoji: '🔥', name: 'Grok', role: 'xAI · Your Key', color: '#ef4444',
    desc: 'Bring your own xAI API key',
    greeting: 'No filter. No rules.\nJust raw intelligence.\nLet\'s go.',
    ready: 'Fire away. What\'s on your mind?',
  },
  gemini: {
    emoji: '✦', name: 'Gemini', role: 'Google · Your Key', color: '#3b82f6',
    desc: 'Bring your own Google API key',
    greeting: 'Multimodal. Multilingual.\nI see the full picture.\nShow me what you\'ve got.',
    ready: 'Standing by. What do you need?',
  },
}

export const CREATURES = ['🦋', '🦊', '🐺', '🦁', '🐉', '🦅', '🌙', '⚡', '🔥', '🌊'] as const

export type GuideKey = keyof typeof GUIDES
export type CauseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6
