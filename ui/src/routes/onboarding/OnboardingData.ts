export const CAUSES = [
  { emoji: '🌊', name: 'Save the Oceans', desc: 'Protect the seas that give us all life', label: '🌊 given', pledge: '"7% of every shell flows to the ocean."' },
  { emoji: '💧', name: 'Clean Water for All', desc: 'Every human deserves clean water', label: '💧 given', pledge: '"7% of every shell flows to clean water."' },
  { emoji: '🤝', name: 'AI for Those in Need', desc: 'Sovereign AI for the underserved', label: '🤝 given', pledge: '"7% of every shell flows to those in need."' },
] as const

export const TIERS = [
  { name: '🌊 Ocean', shells: '1,000 shells / mo', price: '$1', id: 'ocean', popular: false, isEnterprise: false },
  { name: '🪸 Reef', shells: '15,000 shells / mo', price: '$10', id: 'reef', popular: false, isEnterprise: false },
  { name: '🌀 Current', shells: '100,000 shells / mo', price: '$49', id: 'current', popular: true, isEnterprise: false },
  { name: '⚓ Fleet', shells: '500,000 shells / mo', price: '$199', id: 'fleet', popular: false, isEnterprise: false },
  { name: '🏛️ Enterprise', shells: 'Custom volume · custom pricing', price: 'Talk to us', id: 'enterprise', popular: false, isEnterprise: true },
] as const

export const PERKS = [
  { icon: '🪼', label: 'Chat with Athena', cost: '1 shell / turn' },
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

export type GuideKey = keyof typeof GUIDES
export type CauseIndex = 0 | 1 | 2
