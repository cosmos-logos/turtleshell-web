# TurtleShell.ai Web

> The web client for TurtleShell.ai — Sovereign AI Assistant.

## Architecture

```
Static HTML (Netlify)     React SPA (Vite)
├── /              →  index.html (landing page)
├── /terms         →  terms.html
├── /privacy       →  privacy.html
├── /security      →  security.html
│
├── /app/chat      →  app.html → React Router
├── /app/services  →  app.html → React Router
├── /app/agents    →  app.html → React Router
├── /app/settings  →  app.html → React Router
└── /app/docs      →  app.html → React Router
```

**Stack:** Vite + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Zustand

**Backend:** Direct browser-to-Athena via CloudFront (CORS configured)

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173/app/chat
npm run build      # Build for production
npm run preview    # Preview production build
```

## Deployment

Deployed to Netlify. Push to `main` to deploy.

```bash
# Manual deploy
npx netlify deploy --prod
```

## Feature Parity with iOS

| Feature | iOS | Web |
|---------|-----|-----|
| Streaming Chat | ✅ | ✅ |
| Service Registry | ✅ | ✅ (UI ready, OAuth Phase 4) |
| Agent System | ✅ | ✅ |
| Environment Picker | ✅ | ✅ |
| OAuth PKCE | ✅ | 🔜 Phase 4 |
| Subscriptions | ✅ | 🔜 Phase 5 |
| TTS / Audio | ✅ | 🔜 Phase 6 |
| Documentation | ✅ | ✅ (structure ready) |

## License

AGPL-3.0 — Copyright © 2026 CloudPremise LLC
