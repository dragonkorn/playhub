---
status: implemented
sources:
  - specs/platform/spec.md
  - docs/adr/0006-local-play-runs-logic-in-the-browser.md
  - apps/web/src/model/local-game.ts
  - apps/web/src/pages/LocalPage.tsx
  - apps/web/src/games.ts
---

# Local play

Two or more people can play one game on one device, with no room, no server and no network (spec section 13). Only games that set `meta.localPlay` offer it, and only games with no hidden information and one active player at a time may set it (O1). Today that is [Four in a Row](four-in-a-row.md).

## Why the browser runs the rules

Normally the web app never imports a game's `logic` (G3), so secrets stay on the server. Local play has no secrets and no referee to protect, and it must work offline, so the web app runs the `logic` of local-play games itself ([ADR-0006](../docs/adr/0006-local-play-runs-logic-in-the-browser.md)). Each such game needs one extra line in `localGames` in `apps/web/src/games.ts` (O8).

## How it works

1. The home page shows Play on this device for a local-play game. The player enters one name per seat. Names follow the same rule as online play, through `normalizeName` in `game-contract`, and must differ (O2).
2. `apps/web/src/model/local-game.ts` sets up and applies moves with the game's own functions, using browser randomness from `crypto.getRandomValues` (O3).
3. It builds the same `RoomSnapshot` shape as a room, so the board and the result screen are shared. The board gets the active seat as `me`, plus `local: true` (O4).
4. A refused move shows the game's translated toast (O5).
5. The game is saved in `SessionRepository` after every move, so a reload resumes it. Leaving deletes it (O6).

There is no lobby, room code, host or disconnect handling. Play again restarts with the same names (O7).

Screen: `apps/web/src/pages/LocalPage.tsx`, at `/local/<gameId>`.
