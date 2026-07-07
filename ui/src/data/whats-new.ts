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
    date: '2026-07-07',
    title: 'The gift of sovereign AI',
    body:
      'The point of TurtleShell was never to be the middle. It\'s to be ' +
      'the shell — a place where you can hold any AI, any voice, any ' +
      'relationship, and know that when you switch, nothing about you ' +
      'gets held on to. Today that promise gets a floor to stand on. ' +
      'You can bring your own OpenAI, Anthropic, xAI, Google, or a ' +
      'local Ollama for your chat. You can bring your own OpenAI voice, ' +
      'ElevenLabs, or your own XTTS server for how your guide sounds. ' +
      'Every reply tells you who really answered — a small chip under ' +
      'each turn — and if the server tries to swap in someone else, ' +
      'you\'ll see a red mark instead of silence. This is ' +
      'freedom-from-vendor-lock-in, in your hands.',
    bullets: [
      'Chat: OpenAI (GPT), Anthropic (Claude), xAI (Grok), Google (Gemini), Ollama (your own machine), LM Studio (your own machine).',
      'Voice: OpenAI TTS, ElevenLabs, XTTS on your own server, plus the built-in voices.',
      'Your key is sealed on your device with the specific god that will use it. Ares (our gate) and Hermes (our router) see only opaque bytes; only the god that needs it can open it.',
      'Under every reply is a Powered-by chip that names who thought and who spoke.',
      'If the server sends back a different provider than you asked for, you keep the answer AND get a red badge — sovereignty violations stay visible.',
      'Using your own key skips your shells for that turn — you paid the provider directly, so we don\'t charge you.',
    ],
  },
  {
    date: '2026-07-02',
    title: 'Athena has the room to herself for now',
    body:
      'Cosmos and Logos are still in the sidebar, but tapping them tells ' +
      'you they\'re back Soon. This isn\'t a demotion — it\'s the ' +
      'opposite. Each guide is a full relationship, and giving Athena the ' +
      'room to be first means we can bring Cosmos and Logos back at the ' +
      'level we want them at. Building your own guide is paused for the ' +
      'same reason. When any of them return, you\'ll know.',
  },
  {
    date: '2026-06-28',
    title: 'Show your guide what you\'re looking at',
    body:
      'You can now attach an image or a file to any turn. Athena\'s ' +
      'analyzer reads it before your guide sees it — a menu photo turns ' +
      'into text, a PDF becomes something your guide can quote. Paste ' +
      'from your clipboard, drag from Finder, or on iOS tap the camera. ' +
      'If your connection stalls partway through, your file is still ' +
      'there when you come back.',
    bullets: [
      'Screenshots, receipts, recipes, tables, notebook pages — anything you\'d hold up on your phone and point at.',
      'Web: paste, drag, or click the paperclip.',
      'iOS: tap the camera or the paperclip; clipboard paste works too.',
      'Nothing is stored on our side. The file rides with the turn and disappears after.',
    ],
  },
  {
    date: '2026-06-10',
    title: 'Your Pantheon follows you',
    body:
      'Every TurtleShell user is bound to a Pantheon — a shard of the ' +
      'fleet that holds your identity, your voice-billing, and your ' +
      'usage history. That binding is now visible. Settings has a ' +
      'Pantheon panel that shows which shard you\'re on and lets you ' +
      'switch (mostly for developers). Your session binds to the shard ' +
      'you\'re on so the fleet knows where to route you even after you ' +
      'switch devices.',
    bullets: [
      'Signing in picks a Pantheon for you automatically. Most people never touch this.',
      'Developers can point at their own local Pantheon for testing.',
      'If you switch shards, your history and voice budget follow.',
    ],
  },
  {
    date: '2026-05-26',
    title: 'Feedback that comes with your device\'s story',
    body:
      'Leave Feedback now attaches the last few minutes of what your ' +
      'device saw — the breadcrumbs (which screen, which button, which ' +
      'call went out), never what you typed or which token was used. ' +
      'Support gets to see the same view of the moment you saw. A small ' +
      'indicator at the bottom of the feedback form shows how many ' +
      'events are riding along.',
    bullets: [
      'Nothing personal — no chat text, no auth tokens, no email in the payload.',
      'Roughly the last thousand events per session, packed into a small file.',
      'A real person on our end reads them; you\'ll usually hear back.',
    ],
  },
  {
    date: '2026-05-18',
    title: 'Sign in with Apple',
    body:
      'The iPhone can now sign in with Apple. Tap the black button on ' +
      'the login screen, use Face ID, and you\'re in. Same identity ' +
      'between iOS and web — sign in with Apple once, and your ' +
      'turtleshell.ai session recognizes you the next time you open ' +
      'the browser.',
    bullets: [
      'If you use Apple\'s Hide My Email, your real address stays private.',
      'The identity carries between iOS and web without re-linking.',
      'If you signed in with an email link before, adding Apple later doesn\'t lose anything.',
    ],
  },
  {
    date: '2026-04-22',
    title: 'Google Workspace joins Salesforce as a connectable tool',
    body:
      'You can now add Google Workspace to any guide that supports it — ' +
      'Athena, Cosmos, or Logos — alongside Salesforce. Each connection is ' +
      'separate, scoped to the guide you added it to, and sealed on your ' +
      'device so only that tool\'s server can read your login.',
    bullets: [
      'Add Google Workspace from Tools → Add a tool. The wizard walks you through Google Cloud\'s OAuth setup.',
      'Each guide holds their own connections. Athena could have your work Google; Cosmos could have your personal one. No crossover.',
      'Ask about your calendar, search Gmail, pull a Drive file, read a Doc or Sheet — all through a normal chat.',
      'Same sovereignty promise as Salesforce: your Google login is encrypted on your device with a key only the Google tool server can unlock.',
      'Switching between Salesforce and Google on different guides proves the security posture scales — one agent can hold both, or two agents can hold one each, and each connection only fires for the guide that authorized it.',
    ],
  },
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
