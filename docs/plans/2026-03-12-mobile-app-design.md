# Mobile App — Design Document

**Date:** 2026-03-12

## Goal

Create standalone Android and iOS versions of the Big Book of Everything using Capacitor. The app runs offline-first with a local SQLite database, reusing the existing SvelteKit UI components.

## Decisions

- **Framework:** Capacitor (wraps existing SvelteKit frontend in native shell)
- **Platforms:** Android (Google Play) + iOS (Apple App Store)
- **Scope:** Big Book of Everything only — no portal mode
- **Data:** Standalone local SQLite database per device, offline-first
- **Repository:** Gitea only (private, commercial product — not published to GitHub)
- **Monetization:** TBD (one-time purchase, subscription, or freemium — to be decided later)
- **App name/branding:** TBD

## Architecture

### SvelteKit Adapter

The web version uses `@sveltejs/adapter-node` (server-side rendering). The mobile version switches to `@sveltejs/adapter-static` — no server process, everything runs client-side as a single-page app.

### SQLite

- **Web/Desktop:** `better-sqlite3` (Node.js native module, synchronous)
- **Mobile:** `@capacitor-community/sqlite` (native SQLite plugin for iOS/Android)
- **Shared:** Same Drizzle ORM schema, same seed logic (`book-structure.json`), same migration files

A thin adapter layer abstracts the DB interface so the same data access code works with either SQLite backend.

### Authentication

No auth layer on mobile. Single user, local device. The app launches directly into the book.

### Encryption

- Same AES-256-GCM field-level encryption as the web version
- Encryption password stored in device keychain via `@capacitor/secure-storage` (not localStorage)
- PBKDF2 key derivation with per-installation salt (same as web)

### What's Removed (vs. Web Version)

- Portal mode (sidebar links to self-hosted services)
- OIDC authentication
- Local auth (password/users mode)
- Emergency access tokens (server-dependent feature)
- Print page (use native share/export instead)
- Server-side rendering

### What's Added (Mobile-Specific)

- Capacitor native shell and config
- SQLite adapter layer for `@capacitor-community/sqlite`
- Secure storage for encryption password
- App icons and splash screens
- App store metadata and screenshots
- Cloud sync (designed separately — see sync design doc)

## Project Structure

```
mobile/
├── capacitor.config.ts
├── android/                  # Generated Android project
├── ios/                      # Generated iOS project
├── src/                      # Shared with web (symlinked or copied)
│   ├── lib/
│   │   ├── components/       # Same Svelte components
│   │   ├── stores/           # Same stores
│   │   └── mobile/
│   │       └── db.ts         # Capacitor SQLite adapter
│   └── routes/
│       └── book/             # Book routes only
├── configs/
│   └── book-structure.json   # Same seed file
├── drizzle/                  # Same migrations
└── package.json
```

## Code Reuse Strategy

The mobile app reuses:
- All Svelte components (`$lib/components/*`)
- All book route pages (`src/routes/book/**`)
- Drizzle schema (`$lib/server/schema.ts`)
- Seed logic and `book-structure.json`
- CSS and theme system (`app.css`)
- Crypto utilities (encrypt/decrypt/hash — Node.js `crypto` replaced with Web Crypto API)

A `$lib/mobile/db.ts` adapter provides the same interface as `$lib/server/db.ts` but backed by Capacitor SQLite.

## Build & Distribution

### Android
- Build: `npx cap sync android && cd android && ./gradlew assembleRelease`
- Distribution: Google Play ($25 one-time developer fee)
- Signing: Android keystore (generated, stored securely)

### iOS
- Build: `npx cap sync ios`, then Xcode archive
- Distribution: Apple App Store ($99/year developer program)
- Signing: Apple provisioning profiles and certificates

## Future Considerations

- **Cloud sync:** Designed separately — encrypted SQLite snapshots pushed/pulled via S3 or self-hosted API
- **Monetization:** IAP/paywall layer can be added via `@capacitor/in-app-purchases` when pricing model is decided
- **Push notifications:** Could notify about reminders (insurance renewals, etc.) via `@capacitor/push-notifications`
