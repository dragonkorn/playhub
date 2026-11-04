---
status: implemented
sources:
  - specs/platform/spec.md
  - packages/game-contract/
  - games/battleship/
  - games/four-in-a-row/
  - games/bai-riang/
  - games/salab-rang/
  - apps/web/src/pages/LocalPage.tsx
  - apps/server/src/games.ts
  - apps/web/src/games.ts
  - apps/web/src/pages/HomePage.tsx
  - apps/web/src/pages/RoomPage.tsx
  - packages/ui/src/atomic-rules.test.ts
---

# Game plug-ins

A game is one folder with two entry points. Adding a game needs one registration line in each app, in `apps/server/src/games.ts` and `apps/web/src/games.ts` (G2). The home page and the atomic rules test pick up new games by themselves. A game that offers [Local play](local-play.md) needs one more line in `localGames` (O8). Four games exist: [Battleship](battleship.md), [Four in a Row](four-in-a-row.md), [ใบ้เรียง](bai-riang.md) and [สลับร่าง](salab-rang.md).

- `logic` runs on the server. It is pure TypeScript with rules, per-player views and no React.
- `ui` runs in the browser. It holds the board, optional options panel and translations.

The server imports only `logic`, and web imports only `ui` (G3), except the `logic` of local-play games ([ADR-0006](../docs/adr/0006-local-play-runs-logic-in-the-browser.md)). This keeps React out of the Worker and game secrets out of the browser. A `ui` may reuse pure helpers from inside its own game folder, as Battleship does with `logic/fleet.ts` for placement checks.

## What a game answers

The platform asks a game a few questions and never looks inside its state:

- Who are we waiting for? `activePlayers`
- Is this move legal, and what's the new state? `applyMove`
- What may this player see? `viewFor`
- Who has been eliminated, and is it over? `eliminatedPlayers`, `outcome`
- This player is gone, how do you continue? `removePlayer`

`viewFor` is what protects hidden information. Every game must pass the shared test kit, which checks that no view leaks secrets (G4).

## What a board receives

The platform renders the game's `Board` in `apps/web/src/pages/RoomPage.tsx`. Besides the view and `send`, it passes helpers, so a game never touches sockets or `localStorage` itself:

- `draft`: device storage for unsent work in this room.
- `preferences`: device settings that outlive a room, such as mute.
- `online`: false while this device's own connection is down.
- `holding` and `release`: control of the moment the result screen appears.
- `local`: true when every seat plays on this device, and `me` is whoever is active (O4).

Normally the result screen appears as soon as the game ends. A game that sets `holdsFinish` keeps its board on screen until it calls `release`. Battleship and Four in a Row do this so the last move can play. A game also gives the result screen its top line through `result.win` and `result.draw` in its catalog (L7), or from its final view through `resultLine` (L9), and can rename the board button with `result.boards` (L10).

## What a game declares

`meta` holds the player range, the `orientations` its screen lays out for ([Screens and frames](screens-and-frames.md)), and `localPlay`. A cooperative game adds `team` to its outcome, which reaches the snapshot as `team` (L8).

A game can also define `startError(options, playerCount)` to refuse a start with a code from its catalog, and its options panel receives `playerCount` (L11). [สลับร่าง](salab-rang.md) uses both for its custom card set.

Contract code: `packages/game-contract/src/index.ts`. Spec: [platform spec](../specs/platform/spec.md), section 8.
