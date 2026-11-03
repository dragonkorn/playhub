---
status: implemented
sources:
  - package.json
  - vitest.config.ts
  - packages/game-contract/src/testing.ts
  - scripts/e2e-room.mjs
  - scripts/e2e-ui.mjs
  - docs/changes/
---

# Testing

Three layers, each catching what the one before can't.

| Layer | Command | What it proves |
|---|---|---|
| Unit | `pnpm test` | Game rules, room rules, local play, placement, playback, sound, translations, atomic layers |
| Real room | `node scripts/e2e-room.mjs` | HTTP, WebSockets and Durable Object storage on `wrangler dev`, for both games |
| Real app | `node scripts/e2e-ui.mjs` | Full journeys in headless Chrome, with touch drag, 10 players, a Four in a Row win and draw, and local play offline |

`pnpm test:e2e` runs both real layers. It needs `pnpm build`, then `pnpm dev:server` running. To test a deployment, pass its URL to either script.

Every game must also pass the test kit in `packages/game-contract/src/testing.ts`, which plays random games and checks that no view leaks secrets (G4).

## Why the real layers exist

`node scripts/e2e-ui.mjs <url> <folder> <scenario>` runs one scenario, such as `caching`, which is quick enough to run after a deploy. Scenarios set the `fxSpeed` device preference to run playback 20 times faster, except `feedback` and `fourInARow`, which check real timing. `localPlay` loads every font face before cutting the network, like a device that has used the app, because fonts are cached on first use (C6).

Each of these passed unit tests, then failed for real:

- Two players tapping Ready together made one move stale.
- A game package loaded its own copy of `react-i18next`, showing raw keys.
- A global CSS rule beat `touch-none`, so touch drag was cancelled.
- A Four in a Row disc atom set `relative`, which overrode `absolute`, so discs fell below the board.
- Offline, the browser's automatic `favicon.ico` request failed, until the page linked a precached icon.

## Reviewing UI changes

A UI change comes with a review doc in `docs/changes/`, with before and after screenshots from the real app and a list of issues seen in them. Example: `docs/changes/2026-11-03-four-in-a-row.md`.

## Still unverified

- `UNVERIFIED`: real iPad behavior for drag, sleep and wake, QR join, sound unlock, and cache lifetime in Safari (spec acceptance items). Four in a Row sounds have not been listened to on a device.
- `UNVERIFIED`: whether the server notices a socket that dies silently, with no close event.
- `UNVERIFIED`: free-tier counts during real play, including how the 20:1 WebSocket rule applies. Both real layers have passed on the live Worker, but nobody has read the dashboard numbers.
