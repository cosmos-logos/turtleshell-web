# Architecture — turtleshell-web

> Sovereign AI Assistant web application
> Organization: cosmos-logos | License: GNU AGPL v3 | Version: 0.1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Application Architecture](#application-architecture)
5. [Routing](#routing)
6. [State Management](#state-management)
7. [Streaming Chat Client](#streaming-chat-client)
8. [Component Architecture](#component-architecture)
9. [Styling System](#styling-system)
10. [Service Integration & MCP](#service-integration--mcp)
11. [Security Model](#security-model)
12. [Build, Deploy & Infrastructure](#build-deploy--infrastructure)
13. [Phase Roadmap](#phase-roadmap)

---

## Overview

turtleshell-web is a React 19 single-page application that provides a web-based AI assistant interface. It communicates with a backend ("Athena") over Server-Sent Events (SSE) for streaming chat, supports pluggable service integrations through the Model Context Protocol (MCP), and offers an agent-switching system. The project is the web counterpart to an iOS application, targeting feature parity across both platforms.

**Current state (as of v0.1.0):** Core UI scaffolding is complete — streaming chat, service registry UI, agent catalog, environment switching, and marketing/legal pages are all implemented. OAuth PKCE token exchange and several service integrations remain planned for future phases.

---

## Technology Stack

| Layer            | Technology                              | Version |
|------------------|-----------------------------------------|---------|
| UI Framework     | React                                   | 19.0.0  |
| Language         | TypeScript (strict mode)                | ~5.7    |
| Build Tool       | Vite                                    | 6.0.0   |
| Routing          | React Router DOM                        | 7.1.0   |
| State Management | Zustand                                 | 5.0.0   |
| CSS Framework    | Tailwind CSS                            | 3.4.0   |
| UI Primitives    | Radix UI (dialog, dropdown, tabs, etc.) | various |
| Icons            | Lucide React                            | 0.469.0 |
| Hosting          | Netlify (static site)                   | —       |

---

## Repository Structure

```
turtleshell-web/
├── CLAUDE.md                         # AI assistant project instructions
├── LICENSE                           # GNU AGPL v3
├── README.md
└── ui/                               # Web application root
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts                # Vite config — @ path alias, port 5173
    ├── tailwind.config.ts            # Custom color palette, fonts, animations
    ├── postcss.config.js
    ├── netlify.toml                  # Deploy config, redirects, security headers
    ├── index.html                    # SPA entry — meta tags, fonts, dark mode
    ├── public/                       # Static assets
    ├── dist/                         # Production build output (gitignored)
    └── src/
        ├── main.tsx                  # React DOM root + BrowserRouter
        ├── App.tsx                   # Route definitions
        ├── globals.css               # Tailwind directives + custom component classes
        ├── vite-env.d.ts
        ├── types/                    # Shared TypeScript interfaces
        │   ├── agent.ts              # Agent, AgentCapability
        │   ├── chat.ts               # ChatMessage, SSEChunk, MessageRole
        │   └── service.ts            # RegisteredService, ServiceCredentials, catalog
        ├── components/
        │   └── layout/               # Structural layout components
        │       ├── AppShell.tsx       # Authenticated app wrapper (sidebar + header)
        │       ├── Header.tsx         # Top bar — agent info, status badge
        │       ├── Sidebar.tsx        # Navigation — desktop collapsible / mobile overlay
        │       └── MarketingLayout.tsx# Public pages wrapper (nav + footer)
        ├── routes/                   # Page-level route components
        │   ├── Landing.tsx           # Marketing homepage
        │   ├── Chat.tsx              # Streaming chat interface
        │   ├── Services.tsx          # Service registry + catalog
        │   ├── Agents.tsx            # Agent switcher
        │   ├── Settings.tsx          # Environment & preferences
        │   ├── Docs.tsx              # Documentation hub (placeholder)
        │   ├── Terms.tsx             # Terms & Conditions
        │   ├── Privacy.tsx           # Privacy Policy
        │   ├── Security.tsx          # Security overview
        │   └── OAuthCallback.tsx     # OAuth provider redirect handler
        └── lib/                      # Business logic & utilities
            ├── athena/
            │   ├── chat-client.ts    # SSE streaming client (async generator)
            │   └── mcp-headers.ts    # MCP credential header builder
            ├── store/
            │   ├── chat-store.ts     # Message state (Zustand)
            │   ├── environment-store.ts # API endpoint config (Zustand + persist)
            │   ├── agent-store.ts    # Agent selection (Zustand + persist)
            │   └── service-store.ts  # Service registry (Zustand + persist, no creds)
            └── utils/
                ├── helpers.ts        # cn(), generateId(), formatTimestamp()
                └── logger.ts         # Structured console logger
```

**Source code:** ~2,450 lines across 27 TypeScript/TSX files.

---

## Application Architecture

The application follows a layered architecture:

```
┌─────────────────────────────────────────────────────┐
│                   Routes (Pages)                    │
│  Landing · Chat · Services · Agents · Settings · …  │
├─────────────────────────────────────────────────────┤
│               Layout Components                     │
│       AppShell · Header · Sidebar · Marketing       │
├──────────────────────┬──────────────────────────────┤
│   State (Zustand)    │     API Client (Athena)      │
│  chat · environment  │   streamChat (SSE generator) │
│  agent · service     │   mcp-headers               │
├──────────────────────┴──────────────────────────────┤
│                   Type System                       │
│         Agent · ChatMessage · Service               │
├─────────────────────────────────────────────────────┤
│              Utilities & Infrastructure             │
│          cn() · logger · generateId()               │
└─────────────────────────────────────────────────────┘
```

**Data flows top-down:** Routes consume Zustand stores via hooks and call the Athena API client. Stores manage their own persistence. The API client reads endpoint configuration from the environment store and service credentials from the service store.

---

## Routing

Defined in `ui/src/App.tsx`. Three distinct route groups:

### Marketing Layout (`/`)
Public-facing pages wrapped in `MarketingLayout` (fixed nav, footer, grid background).

| Path        | Component    | Purpose                    |
|-------------|--------------|----------------------------|
| `/`         | `Landing`    | Hero, features, CTA        |
| `/terms`    | `Terms`      | Terms & Conditions         |
| `/privacy`  | `Privacy`    | Privacy Policy             |
| `/security` | `Security`   | Security architecture docs |

### OAuth Callback (`/oauth/callback/:provider`)
Standalone route (no layout wrapper). Handles provider redirects, extracts authorization codes, and redirects to `/app/services` on success.

### App Shell (`/app/*`)
Authenticated application wrapped in `AppShell` (sidebar + header).

| Path             | Component   | Purpose                      |
|------------------|-------------|------------------------------|
| `/app/chat`      | `Chat`      | Streaming AI chat (default)  |
| `/app/services`  | `Services`  | Service registry & catalog   |
| `/app/agents`    | `Agents`    | Agent selection              |
| `/app/settings`  | `Settings`  | Preferences & environment    |
| `/app/docs/*`    | `Docs`      | Documentation (placeholder)  |

A catch-all route redirects any unmatched path to `/`.

---

## State Management

Four Zustand stores, each a standalone hook. Three use the `persist` middleware for localStorage.

### `useChatStore` — `lib/store/chat-store.ts`
Ephemeral message state (not persisted).

| Field       | Type            | Purpose                                   |
|-------------|-----------------|-------------------------------------------|
| `messages`  | `ChatMessage[]` | Conversation history                      |
| `isStreaming`| `boolean`      | Whether a response is actively streaming  |
| `error`     | `string | null` | Current error message                     |

Actions: `addMessage`, `updateLastAssistantMessage`, `setStreaming`, `setError`, `clearMessages`.

### `useEnvironmentStore` — `lib/store/environment-store.ts`
API endpoint configuration. Persisted to `turtleshell-environment`.

| Field            | Type                              | Default     |
|------------------|-----------------------------------|-------------|
| `current`        | `'cloud' \| 'offgrid' \| 'custom'`| `'offgrid'` |
| `customEndpoint` | `string`                          | `''`        |
| `developerMode`  | `boolean`                         | `false`     |

Computed: `getBaseUrl()` resolves the active endpoint URL.

- **Cloud:** `https://us-west-1-api-int.olympus-grid.ai/v1/athena`
- **Off-Grid:** `https://athena-616.ngrok.io`
- **Custom:** User-defined

### `useAgentStore` — `lib/store/agent-store.ts`
Agent selection state. Persisted to `turtleshell-agents`.

Four pre-defined agents:

| Agent      | Capabilities                       | Required Services |
|------------|------------------------------------|--------------------|
| Athena     | chat, mcp, reasoning               | None               |
| Apollo     | chat, mcp, reasoning, code         | GitHub             |
| Hermes     | chat, mcp, reasoning, search       | Salesforce         |
| Hephaestus | chat, mcp, reasoning, code, voice  | GitHub             |

### `useServiceStore` — `lib/store/service-store.ts`
Service integration registry. Persisted to `turtleshell-services` **with credentials excluded** — the `partialize` option strips `credentials` from all registered services before writing to localStorage.

Pre-defined service catalog (6 services): Salesforce, GitHub, HubSpot, Google Calendar, Slack, Workday.

Service categories: `reasoning`, `crm`, `sourceControl`, `calendar`, `communication`, `storage`, `database`, `identity`, `payment`, `voice`.

---

## Streaming Chat Client

`lib/athena/chat-client.ts` — The core API integration, implemented as an **async generator**.

### Request

```
POST ${baseUrl}/chat
Content-Type: application/json
Body: { "prompt": "...", "stream": true }
```

Optional MCP headers are attached when a service is connected (e.g., `Authorization: Bearer <token>`, `salesforce-url: <url>`).

### Response Parsing

The client handles **five SSE response formats** to accommodate backend flexibility:

1. **Structured SSE:** `data: {"type":"token","content":"..."}`
2. **OpenAI-compatible:** `data: {"choices":[{"delta":{"content":"..."}}]}`
3. **Text object:** `data: {"text":"..."}`
4. **Plain text streaming:** Non-SSE lines streamed directly
5. **NDJSON:** `{"content":"..."}`

The generator yields `SSEChunk` objects (`{ type: 'token' | 'done' | 'error', content?, error? }`).

### Cancellation

Accepts an `AbortSignal` for mid-stream cancellation via the browser's `AbortController`. The Chat UI provides a "Stop" button that triggers abort.

### Error Handling

- Network failures: Detected and reported with human-readable messages
- HTTP 403: Suggests checking API access configuration
- HTTP 404: Suggests verifying the endpoint URL
- Other HTTP errors: Status-specific messages

---

## Component Architecture

### Layout Components (`components/layout/`)

**AppShell** — Top-level app container. Manages sidebar collapse state and mobile menu visibility. Renders `Header` + `Sidebar` + `<Outlet />` for nested routes. Responsive: sidebar collapses to icon-only on desktop; becomes a right-side overlay on mobile.

**Header** — Fixed 56px top bar. Displays: sidebar expand button, active agent name (desktop), "Connected" status badge (desktop), mobile menu toggle.

**Sidebar** — Navigation with two rendering modes:
- Desktop: Left-side, collapsible between 240px and 56px. Shows labels when expanded, icons-only when collapsed.
- Mobile: Right-side 288px overlay with backdrop, triggered from Header.
- Navigation items: Chat, Services, Agents, Docs, Settings.
- Environment badge visible only in developer mode.

**MarketingLayout** — Public page wrapper with fixed navigation bar, grid background with radial gradient, footer with legal links and GitHub link.

### Route Components (`routes/`)

Each route is a self-contained page component that directly imports its needed Zustand stores and utilities. No prop drilling — all state access is via hooks.

---

## Styling System

### Tailwind Configuration

Dark-first design with a custom semantic color palette defined in `tailwind.config.ts`:

| Token     | Purpose                           | Example                |
|-----------|-----------------------------------|------------------------|
| `shell`   | Primary accent (green spectrum)   | `shell-500: #22c55e`  |
| `surface` | Background layers (dark grays)    | `surface-0` through `surface-4` |
| `border`  | Border colors                     | `border-DEFAULT`, `border-accent` |
| `text`    | Typography colors                 | `text-primary`, `text-muted` |

Custom font families: **DM Sans** (sans), **JetBrains Mono** (mono), **Cabinet Grotesk** (display).

Custom animations: `fade-in`, `slide-in-right`, `pulse-dot`, `stream-in`.

### Custom CSS Classes (`globals.css`)

Tailwind `@apply` directives define reusable component classes:
- `.app-shell` — Full-viewport flex container
- `.main-content` — Scrollable content area
- `.chat-container` — Message list with padding
- `.message-bubble` / `.message-bubble-user` / `.message-bubble-assistant` — Chat bubble variants
- `.streaming-cursor` — Animated blinking cursor for active streaming

Custom scrollbar styling: 6px width, surface-colored track/thumb.

---

## Service Integration & MCP

The service system is designed around the **Model Context Protocol (MCP)** — credentials for connected services are forwarded to the Athena backend as HTTP headers, allowing the AI to interact with external systems on the user's behalf.

### Architecture

```
┌──────────┐     MCP Headers      ┌──────────┐     MCP      ┌──────────────┐
│  Browser  │ ──────────────────► │  Athena   │ ──────────► │  Salesforce   │
│ (web app) │  Authorization:     │ (backend) │             │  GitHub, etc. │
│           │  Bearer <token>     │           │             │               │
└──────────┘                      └──────────┘             └──────────────┘
```

### Service Catalog

| Service         | Category       | Provider     | Status      |
|-----------------|----------------|--------------|-------------|
| Salesforce CRM  | crm            | salesforce   | Available   |
| GitHub          | sourceControl  | github       | Available   |
| HubSpot         | crm            | hubspot      | Coming Soon |
| Google Calendar | calendar       | google       | Coming Soon |
| Slack           | communication  | slack        | Coming Soon |
| Workday         | crm            | workday      | Coming Soon |

### Credential Security

- Credentials are held in-memory only (Zustand store).
- The `persist` middleware explicitly excludes credentials via `partialize`.
- MCP headers are built on-demand from the active service's in-memory credentials.
- OAuth tokens are forwarded to the backend — never exposed in AI responses.

---

## Security Model

### Client-Side

- **No credential persistence:** Service tokens live only in memory.
- **React auto-escaping:** XSS protection by default.
- **HTTPS enforcement:** Netlify enforces TLS.
- **OAuth PKCE:** Planned for Phase 4 (currently placeholder).

### Deployment (Netlify)

Security headers configured in `netlify.toml`:

| Header                    | Value                                 |
|---------------------------|---------------------------------------|
| X-Frame-Options           | DENY                                  |
| X-Content-Type-Options    | nosniff                               |
| Referrer-Policy           | strict-origin-when-cross-origin       |
| Permissions-Policy        | camera=(), microphone=(), geolocation=()|

### Backend (documented in Security page)

- TLS 1.3 with certificate pinning (iOS) and HSTS (web)
- AWS CloudFront + WAFv2
- 72-hour incident notification policy
- Vulnerability reporting: security@cloudpremise.com

---

## Build, Deploy & Infrastructure

### Development

```bash
npm run dev          # Vite dev server — localhost:5173, HMR enabled
npm run lint         # ESLint
npm run type-check   # TypeScript --noEmit
```

### Production Build

```bash
npm run build        # tsc -b && vite build → dist/
npm run preview      # Serve production build locally
```

Vite config: `@` path alias maps to `./src`. React plugin with automatic JSX transform (no React import needed).

### Deployment

**Platform:** Netlify
**Build command:** `npm run build`
**Publish directory:** `dist`

SPA routing: All paths rewrite to `/index.html` (HTTP 200).
Special redirect: `/download` → Apple App Store (HTTP 302).
Static asset caching: 1 year, immutable.

### Infrastructure Topology

```
┌─────────┐       ┌──────────┐       ┌──────────────────────────────┐
│ Browser  │──────►│ Netlify  │       │  AWS Olympus-Grid            │
│          │ HTTPS │ (CDN)    │       │  ┌────────────────────────┐  │
│          │       │ Static   │       │  │ Athena API (backend)   │  │
│          │       │ SPA      │       │  │ /v1/athena/chat        │  │
│          │       └──────────┘       │  └────────────────────────┘  │
│          │──────────────────────────┤  ┌────────────────────────┐  │
│          │  SSE (streaming chat)    │  │ CloudFront + WAFv2     │  │
│          │  + MCP headers           │  └────────────────────────┘  │
└─────────┘                           └──────────────────────────────┘
```

---

## Phase Roadmap

| Phase | Feature              | Status                                  |
|-------|----------------------|-----------------------------------------|
| 1-3   | Core UI & Streaming  | Complete — chat, services UI, agents, settings, marketing pages |
| 4     | OAuth PKCE           | Planned — token exchange for Salesforce, GitHub |
| 5     | Subscriptions        | Planned — App Store integration, credits |
| 6     | Audio / TTS          | Planned — text-to-speech, voice input   |

### Current Gaps

- **No automated tests** — no test framework configured.
- **No CI/CD pipeline** — relies on Netlify's build-on-push.
- **OAuth token exchange** — OAuthCallback component has placeholder logic.
- **Documentation pages** — route exists but content is not implemented.
- **No analytics** — no telemetry or usage tracking.

---

*Last updated: February 2026 — v0.1.0*
