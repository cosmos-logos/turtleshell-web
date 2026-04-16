// Canonical 7 causes / pillars — the single source of truth used by:
//   - routes/Landing.tsx (tithe spinner, pillars grid)
//   - routes/onboarding/Onboarding.tsx (cause-picker step — re-exports
//     from here as OnboardingData.CAUSES to preserve the existing API)
//
// "Cause" (onboarding cause-picker language) and "Pillar" (landing-
// page macro frame) are the same concept — the 7 buckets the 7% tithe
// flows into. We render them as pillars on the landing and as causes
// during onboarding, but the data model is identical.

export interface Cause {
  /** Stable slug — use this as the only foreign key. */
  slug: string;
  emoji: string;
  /** Roman numeral used in the landing pillars grid. */
  roman: string;
  /** Short name (onboarding card title, pillar chip). */
  name: string;
  /** Onboarding cause-card description (one line). */
  shortDesc: string;
  /** Longer marketing prose for the tithe spinner on the landing. */
  landingDesc: string;
  /** Pledge line shown after selection ("7% of every shell flows to …"). */
  pledge: string;
  /** Unit suffix used in the activity / ledger views. */
  label: string;
}

export const CAUSES: readonly Cause[] = [
  {
    slug: 'oceans',
    emoji: '🌊',
    roman: 'I',
    name: 'Save the Oceans',
    shortDesc: 'Protect the seas that give us all life',
    landingDesc:
      'Funding ocean conservation, reef restoration, and marine ecosystem protection worldwide.',
    pledge: '"7% of every shell flows to the ocean."',
    label: '🌊 given',
  },
  {
    slug: 'water',
    emoji: '💧',
    roman: 'II',
    name: 'Clean Water for All',
    shortDesc: 'Every human deserves clean water and sanitation',
    landingDesc:
      'Delivering clean, accessible water to communities in need — one of the most fundamental human rights.',
    pledge: '"7% of every shell flows to clean water."',
    label: '💧 given',
  },
  {
    slug: 'food',
    emoji: '🍎',
    roman: 'III',
    name: 'Food & Nutrition',
    shortDesc: 'End hunger and ensure food security for all',
    landingDesc:
      'Ending hunger and building durable food security through regenerative farming and local supply resilience.',
    pledge: '"7% of every shell flows to feed the world."',
    label: '🍎 given',
  },
  {
    slug: 'health',
    emoji: '🏥',
    roman: 'IV',
    name: 'Healthcare for All',
    shortDesc: 'Essential medicine and care for every human',
    landingDesc:
      'Bringing essential medicine, preventative care, and health infrastructure to every human being.',
    pledge: '"7% of every shell flows to global health."',
    label: '🏥 given',
  },
  {
    slug: 'shelter',
    emoji: '🏠',
    roman: 'V',
    name: 'Shelter & Housing',
    shortDesc: 'A safe place to live is a human right',
    landingDesc:
      'Building dignified, sustainable housing — a safe place to live is a human right, not a privilege.',
    pledge: '"7% of every shell flows to shelter."',
    label: '🏠 given',
  },
  {
    slug: 'education',
    emoji: '📚',
    roman: 'VI',
    name: 'Education & Literacy',
    shortDesc: 'Quality learning to break the cycle of poverty',
    landingDesc:
      'Delivering quality learning — literacy, numeracy, curiosity — to break the cycle of poverty in every generation.',
    pledge: '"7% of every shell flows to education."',
    label: '📚 given',
  },
  {
    slug: 'ai-for-all',
    emoji: '🤝',
    roman: 'VII',
    name: 'AI for Those in Need',
    shortDesc: 'Sovereign AI for the underserved',
    landingDesc:
      'Providing sovereign AI access to underserved communities — education, opportunity, and growth without gatekeeping.',
    pledge: '"7% of every shell flows to those in need."',
    label: '🤝 given',
  },
] as const;

export type CauseSlug = (typeof CAUSES)[number]['slug'];
