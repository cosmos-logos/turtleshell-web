# Changelog — TurtleShell Web

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).
Version numbers follow the Olympus-616 convention: `MAJOR.MINOR.PATCH.BUILD`.

---

## [1.7.4] - 2026-04-09

First stable global deployment of TurtleShell Web. The full TurtleShell/Olympus-616
architecture — including turtleshell.ai, api-int.turtleshell.ai, and olympus-grid — is
live in production as of this release.

### Added

- Production deployment of turtleshell.ai on Netlify, backed by the olympus-616 fleet on
  AWS ECS behind api-int.turtleshell.ai (CloudFront)
- User signup and onboarding flow end-to-end: magic-link email request, waitlist approval,
  "Welcome to the Ocean" email, and active account transition
- Public profile pages at `/u/{username}` with owner inline editing

### Changed

- Version aligned to 1.7.4 in sync with olympus-grid 1.7.4 and the olympus-616 fleet

---
