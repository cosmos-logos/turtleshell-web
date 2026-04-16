// Canonical tier catalog. Consumed by:
//   - routes/Landing.tsx (public pricing grid)
//   - routes/onboarding/Onboarding.tsx (paid-tier selection step)
//   - routes/Shells.tsx (upgrade / plan-change surface)
//   - iOS mirrors this shape in Core/TierCatalog.swift
//
// Changing the tier set here means updating:
//   1. Plutus STRIPE_PRICES (plutus/api/src/stripe/prices.ts) to match slugs + shell counts
//   2. iOS StoreKit .storekit config + APPLE_PRODUCT_TO_TIER map
//   3. Salesforce TurtleshellProfile__c.Tier__c picklist values
//
// "Free Forever" is a non-billed state — no Stripe product. Enterprise
// is contact-sales — no Stripe product either; the CTA routes to the
// waitlist flow with ?source=enterprise.

export type TierSlug =
  | 'free_forever'
  | 'beachcomber'
  | 'tide'
  | 'reef'
  | 'abyss'
  | 'enterprise';

export interface Tier {
  slug: TierSlug;
  name: string;
  tagline: string;
  /** Numeric USD/month, or null for Free / Custom. */
  priceUsd: number | null;
  /** How the price renders ("Free" | "$4.99" | "Custom"). */
  priceLabel: string;
  /** Monthly shell allowance. null = non-metered (Free/Enterprise). */
  monthlyShells: number | null;
  /** Short, copy-ready shells line shown on marketing cards. */
  shellsLabel: string;
  /** Bullet features for marketing cards. Order is presentation order. */
  features: readonly string[];
  /** Feature bullets that should visually stand out (key selling points). */
  highlightFeatures?: readonly string[];
  /** CTA button label on the pricing card. */
  ctaLabel: string;
  /** Badge to render above the card. */
  badge?: 'popular' | null;
  /** Layout hint — Enterprise spans the full row below the 5-tier grid. */
  span?: 'full' | null;
  /** Free Forever gets its own accent treatment on marketing surfaces. */
  isFree?: boolean;
  /** Enterprise is contact-sales and gets the gold accent color. */
  isEnterprise?: boolean;
}

export const TIERS: readonly Tier[] = [
  {
    slug: 'free_forever',
    name: 'Free Forever',
    tagline: '"Solar Powered AI, Free to The World, Forever"',
    priceUsd: null,
    priceLabel: 'Free',
    monthlyShells: 0,
    shellsLabel: 'Free, forever',
    features: [
      'Link in Bio — yours, forever',
      'Access to the Off-Grid network',
      'Cosmos-Logos agent discovery',
      'TurtleShell community access',
    ],
    highlightFeatures: ['Link in Bio — yours, forever'],
    ctaLabel: 'Claim Your Shell',
    isFree: true,
  },
  {
    slug: 'beachcomber',
    name: 'Beachcomber',
    tagline: '"For Those Just Starting Your Dig"',
    priceUsd: 4.99,
    priceLabel: '$4.99',
    monthlyShells: 500,
    shellsLabel: '500 shells / mo',
    features: [
      '500 Sea Shells · ~60 min of Athena',
      'BYOK — OpenAI, Claude, Grok, Gemini, ElevenLabs & more',
      'Full Speech — never type again*',
      'Cosmos-Logos agent discovery',
    ],
    highlightFeatures: ['500 Sea Shells · ~60 min of Athena'],
    ctaLabel: 'Start Digging',
  },
  {
    slug: 'tide',
    name: 'Tide',
    tagline: '"For Those Who Sea"',
    priceUsd: 14.99,
    priceLabel: '$14.99',
    monthlyShells: 2000,
    shellsLabel: '2,000 shells / mo',
    features: [
      '2,000 Sea Shells',
      'Email & Text your Assistant',
      'BYOK, Speech, Cosmos-Logos',
      'Everything in Beachcomber',
    ],
    highlightFeatures: ['2,000 Sea Shells'],
    ctaLabel: 'Ride the Tide',
  },
  {
    slug: 'reef',
    name: 'Reef',
    tagline: '"For Those Who Do Not Waste"',
    priceUsd: 39.99,
    priceLabel: '$39.99',
    monthlyShells: 10000,
    shellsLabel: '10,000 shells / mo',
    features: [
      '10,000 Sea Shells · ~10 hrs of Athena',
      'BYOK, Speech, Cosmos-Logos, Email/SMS',
      'Create Your Own Agent',
      'MCP Connections*',
      'Code, documents & image generation*',
    ],
    highlightFeatures: [
      '10,000 Sea Shells · ~10 hrs of Athena',
      'Create Your Own Agent',
    ],
    ctaLabel: 'Claim the Reef',
    badge: 'popular',
  },
  {
    slug: 'abyss',
    name: 'Abyss',
    tagline: '"For Those Who Look Deep and Wide"',
    priceUsd: 99.99,
    priceLabel: '$99.99',
    monthlyShells: 100000,
    shellsLabel: '100,000 shells / mo',
    features: [
      '100,000 Sea Shells · ~100 hrs of Athena',
      'All Reef features included',
      'Share your agent — get paid',
      'Salesforce Embedded Viewer Access',
      'Priority Support',
    ],
    highlightFeatures: [
      '100,000 Sea Shells · ~100 hrs of Athena',
      'Share your agent — get paid',
    ],
    ctaLabel: 'Descend to Abyss',
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    tagline: '"Your Grid, Your Rules"',
    priceUsd: null,
    priceLabel: 'Custom',
    monthlyShells: null,
    shellsLabel: 'Custom',
    features: [
      'Host on Azure, AWS, or your own fleet',
      'Off-grid Mac Mini & Raspberry Pi clusters',
      'Custom deployments & professional services',
      'Dedicated AI Architects',
      'Dedicated Enterprise Support',
      'Salesforce AppExchange managed package',
    ],
    highlightFeatures: ['Host on Azure, AWS, or your own fleet'],
    ctaLabel: 'Contact Us',
    span: 'full',
    isEnterprise: true,
  },
] as const;

/** Paid tiers only — used by onboarding + Shells upgrade surfaces. */
export const PAID_TIERS = TIERS.filter(
  (t) => !t.isFree && !t.isEnterprise,
);

/** Lookup helper — returns undefined for unknown slugs. */
export function getTier(slug: TierSlug | string): Tier | undefined {
  return TIERS.find((t) => t.slug === slug);
}
