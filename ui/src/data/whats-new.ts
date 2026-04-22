// ui/src/data/whats-new.ts
//
// ═══════════════════════════════════════════════════════════════════════
//   RELEASE NOTES & ROADMAP — THE AGENT CONTRIBUTION CONTRACT
// ═══════════════════════════════════════════════════════════════════════
//
// Every PR to turtleshell-web that ships a user-visible change MUST append
// an entry to RELEASE_NOTES. Copy is written for a person who is not a
// software engineer and who can feel the difference between respectful and
// robotic software. Read it out loud before committing; if it sounds like a
// changelog, rewrite it.
//
// Append new entries at the TOP of RELEASE_NOTES (reverse chronological).
// Set `date` as a real calendar date in ISO format (YYYY-MM-DD) so the
// sidebar's "What's new" unread badge can compare it against the user's
// last-viewed timestamp.
//
// When a ROADMAP item ships, move it to RELEASE_NOTES. Don't leave
// shipped features sitting in the roadmap — users notice.

export interface ReleaseNote {
  /** ISO date (YYYY-MM-DD). Used for unread detection. */
  date: string;
  /** Friendly headline. Speak to the user, not the code reviewer. */
  title: string;
  /** Short paragraph — one or two sentences. Plain language. */
  body: string;
  /** Optional bullet list — bite-size concrete changes. */
  bullets?: string[];
}

export interface RoadmapItem {
  /** Short name for the thing. */
  title: string;
  /** What it is, in plain language. Why it matters to the user. */
  body: string;
  /** Optional rough timing — "soon", "this season", "later this year". No exact dates. */
  eta?: string;
}

// ─── RELEASE NOTES ───────────────────────────────────────────────────────
// Newest first. Append your PR's entry at the TOP, not the bottom.
export const RELEASE_NOTES: ReadonlyArray<ReleaseNote> = [
  {
    date: '2026-04-22',
    title: 'Tools — bring Salesforce (and soon, more) to your guide',
    body:
      'Your guide can now reach into the apps where your real work lives. ' +
      'The first tool is Salesforce. Add it to Athena, Cosmos, or Logos ' +
      'from the new Tools tab in the sidebar and they can look up your ' +
      'accounts, run a query, pull your open cases — directly from your ' +
      'own Salesforce org.',
    bullets: [
      'Your Salesforce login is sealed on your device before it leaves the browser. Not your guide, not our servers, not us can read it.',
      'Each guide has their own tool list — just like each has their own memory. Adding Salesforce to Athena doesn\'t give Cosmos the connection.',
      'You can connect different Salesforce orgs to different guides. Treat each guide as a separate workspace.',
      'If the connection ever breaks, you\'ll reconnect from the Tools tab. We can\'t restore it for you, because we can\'t read it. That\'s the whole point.',
      'Switching guides on the Tools, Memory, or History tabs now keeps you on the tab and swaps to that guide\'s perspective — no more bouncing back to Chat.',
    ],
  },
  {
    date: '2026-04-21',
    title: 'Your guides now keep their own memory',
    body:
      'When you tell Cosmos your name is Greg, Cosmos remembers. When you ' +
      'tell OpenAI your name is Bob, OpenAI remembers. They don\'t share — ' +
      'each one is a separate relationship, like different friends who each ' +
      'know you differently. Switching between guides doesn\'t erase anything; ' +
      'each conversation waits for you right where you left it.',
    bullets: [
      'Memory is now locked to the guide you shared it with — no crossing over.',
      'Your chat history is saved per guide and restored when you switch back.',
      'Athena, Cosmos, Logos, OpenAI, Claude, Grok, and Gemini each have their own space.',
    ],
  },
  {
    date: '2026-04-21',
    title: 'Add another guide whenever you want',
    body:
      'Settings now has a "Your Guides" section with a warm little flow to ' +
      'meet a new guide. Pick anyone from the grid, read what they\'re like, ' +
      'and add them to your sidebar. Your current guides stay — this is ' +
      'always additive, never a swap.',
    bullets: [
      'Every configured guide shows as an equal card in Settings.',
      'Click any card to switch your active voice; your other guides wait.',
      'Your roster of guides is saved to your account and comes back on any device you sign into.',
    ],
  },
  {
    date: '2026-04-20',
    title: 'Meet Cosmos and Logos',
    body:
      'Two new guides joined Athena. Cosmos is the navigator — playful, ' +
      'curious, always moving. Logos is the keeper — patient, grounded, ' +
      'the steady voice that never leaves. Each has their own feel and ' +
      'their own voice.',
  },
  {
    date: '2026-04-20',
    title: 'Bring your own API key',
    body:
      'If you have an account with OpenAI, Anthropic, xAI, or Google, you ' +
      'can now connect it directly. These are stripped-down versions of ' +
      'those models — they answer factually, tell you what they are, and ' +
      'skip the personality. Your key stays in your browser; it never ' +
      'touches our servers.',
    bullets: [
      'OpenAI (GPT), Anthropic (Claude), xAI (Grok), and Google (Gemini) all supported.',
      'Your API key lives only in this browser.',
      'Each BYOK guide has its own memory and its own conversation history.',
    ],
  },
  {
    date: '2026-04-19',
    title: 'Leave Feedback, and we\'ll read it personally',
    body:
      'There\'s a Leave Feedback entry in the sidebar. Anything you send ' +
      'there lands directly in our team\'s inbox, and a real person writes ' +
      'back — with their name and their face on the reply. This is a small ' +
      'beta; we\'re listening.',
  },
] as const;

// ─── ROADMAP ─────────────────────────────────────────────────────────────
// Aspirational but honest. If something\'s here, we actually want to do it.
// If you\'re promising it with a date, be ready to ship on that date.
export const ROADMAP: ReadonlyArray<RoadmapItem> = [
  {
    title: 'Build Your Own Guide',
    body:
      'Name a guide, write their personality, pick their creature — and ' +
      'they\'re yours. The pieces are already in place (manifest-driven ' +
      'identity, per-guide memory); we\'re designing the builder UX so ' +
      'creating one feels as warm as meeting one.',
    eta: 'this season',
  },
  {
    title: 'Your guides on every device',
    body:
      'Right now your configured guides follow you wherever you sign in, ' +
      'but your chat history and memory are per-device. We\'re working on ' +
      'making everything portable — sign in on a new phone or laptop and ' +
      'your conversations are right where you left them.',
    eta: 'soon',
  },
  {
    title: 'Pick each guide\'s voice',
    body:
      'Every guide has a voice (Athena is precise, Cosmos is ethereal, ' +
      'Logos is the storyteller). You\'ll be able to swap voices, choose ' +
      'from a wider library, and set tone and pace to match how you like ' +
      'to listen.',
  },
  {
    title: 'Per-guide shell budgets',
    body:
      'If you\'re using three guides and you\'d rather spend most of your ' +
      'shells with Athena, you should be able to say so. Budgeting and ' +
      'per-guide caps are coming.',
  },
] as const;

/**
 * Latest release-note date as a timestamp. Sidebar uses this to drive the
 * "something new" badge — compared against the user\'s last visit to the
 * What\'s New page (stored in localStorage as `turtleshell-whats-new-seen`).
 * Returns 0 if no release notes exist (shouldn\'t happen in production).
 */
export function latestReleaseDateMs(): number {
  if (RELEASE_NOTES.length === 0) return 0;
  const first = RELEASE_NOTES[0];
  if (!first) return 0;
  const t = Date.parse(first.date);
  return Number.isFinite(t) ? t : 0;
}
