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
| Real room | `node scripts/e2e-room.mjs` | HTTP, WebSockets and Durable Object storage on `wrangler dev`, for every game |
| Real app | `node scripts/e2e-ui.mjs` | Full journeys in headless Chrome, with touch drag, 10 players, a Four in a Row win and draw, local play offline, ใบ้เรียง on phones and an iPad, and a สลับร่าง game with a challenge and a private look |

`pnpm test:e2e` runs both real layers. It needs `pnpm build`, then `pnpm dev:server` running. To test a deployment, pass its URL to either script.

Every game must also pass the test kit in `packages/game-contract/src/testing.ts`, which plays random games and checks that no view leaks secrets (G4).

## Why the real layers exist

`node scripts/e2e-ui.mjs <url> <folder> <scenario>` runs one scenario, such as `caching`, which is quick enough to run after a deploy. Scenarios set the `fxSpeed` device preference to run playback 20 times faster, except `feedback` and `fourInARow`, which check real timing. `baiRiang` plays on two portrait phones and a landscape iPad, makes one mistake, wins all 3 levels, and checks every screen fits its frame. `salabRang` checks the lobby refuses a short custom set, then plays memorize, a swap, a challenge where a player changes their answer, a seer's private look, and peeks until the market closes. The room script plays a whole สลับร่าง game over sockets and checks answers stay private. `localPlay` loads every font face before cutting the network, like a device that has used the app, because fonts are cached on first use (C6).

Each of these passed unit tests, then failed for real:

- Two players tapping Ready together made one move stale.
- A game package loaded its own copy of `react-i18next`, showing raw keys.
- A global CSS rule beat `touch-none`, so touch drag was cancelled.
- A Four in a Row disc atom set `relative`, which overrode `absolute`, so discs fell below the board.
- Offline, the browser's automatic `favicon.ico` request failed, until the page linked a precached icon.

## Reviewing UI changes

A UI change comes with a review doc in `docs/changes/`, with before and after screenshots from the real app and a list of issues seen in them. Examples: `docs/changes/2026-11-03-four-in-a-row.md`, `docs/changes/2026-11-04-bai-riang.md` and `docs/changes/2026-11-04-salab-rang.md`.

## Still unverified

- `UNVERIFIED`: real iPad behavior for drag, sleep and wake, QR join, sound unlock, and cache lifetime in Safari (spec acceptance items). Four in a Row and ใบ้เรียง sounds have not been listened to on a device, and hold to reveal hasn't been tried on a real phone.
- `UNVERIFIED`: whether the server notices a socket that dies silently, with no close event.
- `UNVERIFIED`: free-tier counts during real play, including how the 20:1 WebSocket rule applies. Both real layers have passed on the live Worker, but nobody has read the dashboard numbers.
