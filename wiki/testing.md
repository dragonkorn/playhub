---
status: implemented
sources:
  - package.json
  - vitest.config.ts
  - packages/game-contract/src/testing.ts
  - scripts/e2e-room.mjs
  - scripts/e2e-ui.mjs
---

# Testing

Three layers, each catching what the one before can't.

| Layer | Command | What it proves |
|---|---|---|
| Unit | `pnpm test` | Game rules, room rules, placement, translations |
| Real room | `node scripts/e2e-room.mjs` | HTTP, WebSockets and Durable Object storage on `wrangler dev` |
| Real app | `node scripts/e2e-ui.mjs` | Full journeys in headless Chrome, with touch drag and 10 players |

`pnpm test:e2e` runs both real layers. It needs `pnpm build`, then `pnpm dev:server` running. To test a deployment, pass its URL to either script.

Every game must also pass the test kit in `packages/game-contract/src/testing.ts`, which plays random games and checks that no view leaks secrets (G4).

## Why the real layers exist

`node scripts/e2e-ui.mjs <url> <folder> caching` runs only the cache check (C6), which is quick enough to run after a deploy.

Each of these passed unit tests, then failed for real:

- Two players tapping Ready together made one move stale.
- A game package loaded its own copy of `react-i18next`, showing raw keys.
- A global CSS rule beat `touch-none`, so touch drag was cancelled.

## Still unverified

- `UNVERIFIED`: real iPad behavior for drag, sleep and wake, QR join, and cache lifetime in Safari (spec acceptance items).
- `UNVERIFIED`: whether the server notices a socket that dies silently, with no close event.
- `UNVERIFIED`: free-tier counts during real play, including how the 20:1 WebSocket rule applies. Both real layers have passed on the live Worker, but nobody has read the dashboard numbers.
