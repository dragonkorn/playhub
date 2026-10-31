---
status: planned
sources:
  - specs/platform/spec.md
  - packages/game-contract/
  - games/battleship/
---

# Game plug-ins

A game is one folder with two entry points. Adding a game needs one registration line in each app (G2).

- `logic` runs on the server. It is pure TypeScript with rules, per-player views and no React.
- `ui` runs in the browser. It holds the board, optional options panel and translations.

The server imports only `logic`, and web imports only `ui` (G3). This keeps React out of the Worker and game secrets out of the browser.

## What a game answers

The platform asks a game a few questions and never looks inside its state:

- Who are we waiting for? `activePlayers`
- Is this move legal, and what's the new state? `applyMove`
- What may this player see? `viewFor`
- Who has been eliminated, and is it over? `eliminatedPlayers`, `outcome`
- This player is gone, how do you continue? `removePlayer`

`viewFor` is what protects hidden information. Every game must pass the shared test kit, which checks that no view leaks secrets (G4).

Contract: [platform spec](../specs/platform/spec.md), section 8.
