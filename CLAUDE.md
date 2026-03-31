# CLAUDE.md — turtleshell-web

This file provides guidance to Claude Code when working in the turtleshell-web repository.

## Project

**turtleshell-web** — Sovereign AI assistant web application. The primary SaaS client for the TurtleShell ecosystem, deployed at turtleshell.ai.

## Tech Stack

- **Vite** + **React** + **TypeScript** + **Tailwind CSS**
- No backend — pure static SPA served via Netlify
- All API calls route through the Ares gateway

## Build Commands

```bash
cd ui && npm install       # Install dependencies
cd ui && npm run build     # Production build
cd ui && npm run dev       # Dev server at https://localhost:5173
cd ui && npm run deploy:prod  # Manual deploy to Netlify production
```

## Deployment

- **Auto-deploy**: Merge to `brain/1.7.x.x` auto-deploys to turtleshell.ai via Netlify.
- **Preview URLs**: PRs get Netlify preview URLs commented automatically.
- **Manual deploy**: `cd ui && npm run deploy:prod`

## Repository

- **Organization**: cosmos-logos (migrated from olympus-616)
- **Remote**: `origin` points to `cosmos-logos/turtleshell-web`
- **Main branch**: `brain/1.7.x.x`

## Key Features

- **Unified 3-mode agent setup**: Olympus-Grid, Developer, Off-Grid connection per agent
- **BYOK providers**: Bring-your-own-key for OpenAI, Anthropic, Google, xAI
- **cosmos-logos sealed envelope handshake**: Ed25519 authentication on every agent connection
- **QR code auto-connect**: Scan to connect to off-grid instances
- **Per-agent chat threading**: Each agent maintains independent message history
- **Dynamic capability unlocking**: Connect Poseidon -> MCP tools appear. Connect Apollo -> TTS appears.
- **Custom agent creation**: Built-in agents with custom `systemPrompt` and `voice`
- **Shell theme bridge**: CSS custom properties set via `style.setProperty()` on `<html>`

## Important Implementation Details

### Agent Picker Portal

The agent picker dropdown uses `createPortal` to render outside the normal DOM hierarchy. This is necessary because `backdrop-blur` on ancestor elements creates a new CSS containing block, which breaks `z-index` stacking. The portal renders directly to `document.body` to avoid this.

### Theme Bridge

Shell theme uses CSS custom properties set via inline `style.setProperty()` on `<html>`. This is the most reliable approach — CSS selector overrides (Tailwind class escaping) are fragile.

### Agora Light Mode

For Agora light mode, inject a `<style>` tag with `[class*="bg-[#hex]"]` attribute selectors — the only approach that reliably overrides Tailwind arbitrary values.

### Request Chain

All chat requests follow: Client -> Ares (security) -> Hermes (routing) -> Athena (LLM). Never bypass this chain. `body.agentId` takes priority over `x-agent-id` header for provider routing.

## Agent Catalog

Matches across web, iOS, and offgrid:

| Agent | Type | Visible |
|-------|------|---------|
| Cosmos | Core | Yes |
| Logos | Core | Yes |
| Athena | LLM | Yes |
| Poseidon | MCP Tools | No (background) |
| Apollo | TTS | No (background) |
| Thoth | Writing | Yes |
| Homework Buddy | Tutoring | Yes |
| Agora | Collaboration | Yes |
| BYOK Providers | User-configured | Yes |

## Git Workflow

```bash
git newthought    # Create a new feature branch from brain/1.7.x.x
git savethought   # Stage and commit current work
git mainbrain     # Merge current branch back to brain/1.7.x.x
git cleanthoughts # Clean up merged branches
```

## Rules

- **NEVER** commit directly to `brain/1.7.x.x`. Always use feature branches.
- **NEVER** add `Co-Authored-By` lines to commits.
- **NEVER** run git add, git commit, or git push. Only Gregory does staging, commits, and pushes. Edit files locally and report what changed.

## License

GNU AGPL v3. All network-facing code must disclose source.
