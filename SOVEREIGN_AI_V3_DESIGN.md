# Sovereign AI v3 — Agent-Anchored Sovereignty

**Status:** implemented in `turtleshell-web` (this repo) as of 2026-07-09. **Not yet migrated** to `turtleshell-ios` or `omens`. iris portal still on v2. This doc is the extractable spec for those follow-ups and the reference for the design's *why* even if the in-flight implementation is later reworked.

## The mental model

**Sovereignty is per-agent, not global.** Every LLM/TTS/tool credential the user brings lives *inside a specific agent*. There is no top-level "Sovereign AI" section anymore — that surface was cognitively wrong because it implied one universal BYOK bag that applies to every service. In practice: the agent is the trust anchor, and its manifest is the contract.

An **agent** is a cosmos-logos manifest. It declares:
- **identity** — `codename`, `displayName`, Ed25519 pubkey (the trust anchor's fingerprint = `SHA-256(raw_pubkey_bytes)`)
- **capabilities** — which verbs it speaks (`x-chat`, `x-speak`, `x-music`, `x-mcp`, …)
- **providers** — for each capability, which upstream vendors it can talk to on the user's behalf (OpenAI, Anthropic, xAI, Gemini, Ollama, ElevenLabs, OpenAI-TTS, XTTS, …)

The agent's Ed25519 pubkey is what user credentials are sealed to. The pubkey fingerprint is what per-agent silos are keyed by. **You do not share credentials across agents.** Adding another agent means adding another trust anchor with its own silo.

## What the user sees

### Settings → Your Agents

A list of agents the user has enabled. Each card has:
- Activate area (tap → this becomes the active agent for chat/voice)
- Settings gear (⚙ Sliders icon) → opens the agent's **Manage sheet**

Two seeds always present: **Athena** (the default cluster's chat) and **Cosmos+Logos** (soon; custom sovereign agents added by the user appear as additional cards).

Empty state: *"Pick your first agent"* → onboarding chooser. "Add another agent" button underneath.

### Manage sheet (per agent)

Three capability rows — hardcoded today, capability-driven tomorrow:

- **LLM providers** — shows active-provider chip; tap → `ProviderChooser` scoped to this agent
- **TTS providers** — shows active-voice chip; tap → `ProviderChooser` scoped to this agent
- **MCP providers** — tap → navigates to the existing `/app/tools` surface, scoped to this agent's tool grants

Each row's active state comes from `sovereign-ai-store` keyed by `agent.pubkeyFingerprint`. `scopeLabel` shows the human-readable agent name and truncated fingerprint so the user always knows *which* agent they're editing.

### Add another agent (modal)

Two tabs:
1. **Cosmos-logos URL** — paste `https://example.com/.well-known/cosmos-logos.json` → verify (fetch + validate identity + pubkey + capabilities) → name → adds a new trust anchor with independent silo
2. **Bring your own key** — pick provider → paste key → seals against the *current Athena* agent → `saveSlot(currentAthenaFp, category, provider, ciphertext)` → `markConfigured(provider)` on the guides store (with `anthropic ↔ claude` mapping)

Both tabs render a step trail (CheckCircle/XCircle) mirroring the SealedEnvelopeDemo pattern.

### Onboarding

Language is **"Agent"** throughout — no "Guide" anywhere:
- Screen title: *"Choose Your Agent"*
- Primary CTA: *"This Is My Agent"*
- Naming step: *"Name Your Agent"* → *"Create My Agent"*

Non-default agent tiles (Cosmos+Logos + custom) shown as `soon: true`. The BYOK link from onboarding is disabled with a SOON badge because that path currently routes through `setUserApiKey` (localStorage plaintext), which violates the no-plaintext-at-rest property. Fix path: route BYOK-onboarding through the same `sealForStorage` ceremony as `AddAgentModal`'s BYOK tab.

### Sidebar

**Tools was removed.** Tools live per-agent in the Manage sheet now. `Sidebar.tsx` no longer imports `Wrench` or renders the Tools nav item.

## Storage contract — sealed at rest, keyed by agent

- **DB:** IndexedDB, name `turtleshell-sovereign-ai`, object store `slots`, version 2
- **Key:** `${godFp}:${category}:${provider}` — three-part composite
  - `godFp` = SHA-256 hex of the trust anchor's raw 32-byte Ed25519 pubkey
  - `category` = `chat` | `voice`
  - `provider` = catalog id (`openai`, `anthropic`, `grok`, `gemini`, `ollama`, `elevenlabs`, `openai-tts`, `xtts`)
- **Value:** `StoredSlot { godFp, category, provider, envelope: Uint8Array (sealed ciphertext), createdAt, endpoint?, model? }`
- **Persist store:** Zustand `turtleshell-sovereign-ai-v3` (schema v4), `chatSlotInfo`/`voiceSlotInfo` are `Record<godFp, Record<provider, SlotInfo>>`

**Plaintext keys never touch disk.** They exist in memory during paste, get `sealForStorage`-ed against the target agent's pubkey, and only the ciphertext blob is persisted. The client cannot decrypt what it sealed (ephemeral sender keypair, `crypto_box_seal`).

## Wire contract — two envelopes, one purpose

Because `sealForStorage` had no timestamp on the inner envelope (fixed material — safe to keep at rest indefinitely), each outbound request needs a fresh outer envelope with anti-replay:

1. Client `loadSlot({ godFp, category, provider })` → sealed inner blob
2. Client calls `sealForWire(innerBlob, agentPubkey)` — wraps the inner in a fresh outer envelope carrying a current timestamp
3. Client sends `{ sovereignAI: { envelope, envelopeVersion: 'cosmos-logos-sealed-v2', provider, model? } }` in request body
4. Athena/Apollo unwrap outer → verify timestamp headroom → unwrap inner → get raw key → adapter call → respond with `x-og-provenance` header (or SSE terminal frame for chat)

Server-side kill-switch: if a god's Ed25519 keypair rotates, ciphertext sealed to the old key no longer decrypts. Athena/Apollo respond with `envelope_storage_stale`; client re-resolves `godFp` from the current manifest, wipes the stale slot, prompts user to re-paste.

## Attribution + tithe

- **BYOK bypasses tithe.** `llm.turn` emits `tithed: false, infrastructureOnly: true`. Plutus was never in the loop — the user paid the provider directly.
- **Olympus-Grid path stays tithed.** `tithed: true`, provider = whatever cluster default resolved to.
- **Attribution mismatch = red chip, keep the response.** If server-returned `chatProvider` disagrees with client-sent, render the response body normally + RED chip *"⚠ Sent {X}, got {Y} — sovereignty mismatch"* + emit `sovereign.attribution.mismatch`. Never destroy the response.

## Provider defaults

Model names are hardcoded per provider in `ProviderCatalog.ts` and **hidden in the UI** in this phase (Steward directive: *"the model itself should be readonly for now, or hidden completely"*). Phase 3 surfaces the model in the Powered-by chip; phase 4 lets the user pick.

## What's carried forward from v2 (still load-bearing)

- **BYOK plaintext gate.** Client refuses to attach `byokKey` plaintext when `LoginServer !== Scratch`. Athena/Apollo reject `envelopeVersion: "phase-1-plaintext"` in production.
- **Never log the raw key.** `Log.Info("settings.sovereign_ai", ...)` emits only `byokPresent: true|false` and `endpointPresent: true|false`.
- **Provider list additions require paired downstream work.** Adding a row to `ProviderCatalog` without a matching Athena/Apollo adapter makes the row selectable but 404 at wire time.

## Files touched (this repo)

- `ui/src/lib/sovereign-ai/envelope.ts` — `computePubkeyFingerprint`, `sealForStorage`, `sealForWire`, `fetchManifestForCeremony`
- `ui/src/lib/sovereign-ai/secure-storage.ts` — IndexedDB with `{godFp}:{category}:{provider}` composite key, `listAllGods()`
- `ui/src/lib/store/sovereign-ai-store.ts` — Zustand v4, `Record<godFp, Record<provider, SlotInfo>>`
- `ui/src/lib/athena/chat-client.ts` — fetches manifest, resolves `godFp`, `envelope_storage_stale` re-resolve + wipe
- `ui/src/lib/audio/audio-manager.ts` — same agent-scoped refactor for Apollo/voice
- `ui/src/components/settings/ProviderChooser.tsx` — takes `manifestUrl` + `scopeLabel` props, resolves `godInfo` at open, scope banner
- `ui/src/components/settings/AgentSettingsSheet.tsx` **(new)** — per-agent credential manager (three capability rows)
- `ui/src/components/settings/AddAgentModal.tsx` **(new)** — two-tab flow (cosmos-logos URL / BYOK)
- `ui/src/routes/Settings.tsx` — SovereignAiSection removed, GuideSection → "Your Agents", cards refactored, AddAgentModal wired
- `ui/src/components/layout/Sidebar.tsx` — Tools nav item removed
- `ui/src/routes/onboarding/GuideScreens.tsx` — "Agent" language, alternate options gated `soon: true`, BYOK link disabled
- `ui/src/routes/onboarding/Onboarding.tsx` — "Name Your Agent" / "Create My Agent"

## Not yet done (post-launch scope unless otherwise noted)

- **Commit + push to PR #74** — everything above is in the working tree, not yet pushed
- **`turtleshell-ios` v3 migration** — same agent-scoped refactor across `SovereignAIStore`, `ProviderCatalog`, envelope sealer, `ProviderChooser` view
- **`omens` v3 migration** — same, plus Godot editor + iOS export patcher considerations
- **iris portal sovereign AI landing** — deferred until other surfaces are stable
- **Fix BYOK onboarding to route through sovereign seal** — currently disabled with SOON badge; wire it through `sealForStorage` against the seed Athena the same way `AddAgentModal`'s BYOK tab does
- **Capability-driven `AgentSettingsSheet`** — render only rows the agent's manifest actually declares (hardcoded three rows today)
- **"Your Sound" as separate top-level section for Apollo** — user directive
- **"Your MCP Servers" as separate top-level section for Poseidon** — user directive
- **Subscribe from local** — checkout flow doesn't work against local Plutus; investigate the shells-purchase endpoint for local dev

## Why this design won (over v2 flat sovereign section)

- **Cognitively matches the trust story.** *"I trust this agent, so I give it credentials"* is how humans think about API keys. v2's flat *"Sovereign AI"* section implied one universal BYOK bag that applies to every service, which was a lie — each surface (chat, voice, tools) actually resolves to a *specific* agent's pubkey.
- **Extensible without touching UI.** Adding a new god that speaks a new capability doesn't need a new Settings section — just a new row in that god's Manage sheet keyed off the capability the manifest declares.
- **Isolation is inherent.** Two agents with different pubkeys have physically separate ciphertext silos. If one god's private key leaks, only credentials sealed to *that* god are compromised.
- **Add-agent = single ceremony.** Whether the user is bringing a full sovereign agent (cosmos-logos URL) or just a raw key (BYOK against current Athena), the modal is the same shape and the credential lands in the same store.
