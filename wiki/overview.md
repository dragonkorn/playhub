---
status: implemented
sources:
  - readme.md
  - specs/README.md
  - package.json
  - pnpm-workspace.yaml
  - apps/web/
  - apps/server/
  - packages/game-contract/
  - games/battleship/
  - docs/adr/0002-single-worker-hosting.md
---

# Overview

PlayHub lets friends play a board game across devices with a room code and no accounts. A server acts as referee, and each device sees only what its player may see.

## Parts

- `apps/web`: the React PWA. Shows platform screens and each game's board. Holds no game rules.
- `apps/server`: one Cloudflare Worker. Serves the web build and the API, and runs one Durable Object per room ([ADR-0002](../docs/adr/0002-single-worker-hosting.md)).
- `packages/game-contract`: the shared types both sides and every game depend on.
- `games/<game>`: one folder per game, split into `logic` and `ui`.

## Dependency direction

Apps depend on games, and games depend on `game-contract`. The platform never contains game-specific code. See [Game plug-ins](game-plugins.md).

## Where a request goes

A device sends a move over WebSocket. The room validates it, applies the game's rules, saves, then sends each player a personal snapshot. See [Realtime and storage](realtime-and-storage.md).

To see how this is tested, read [Testing](testing.md).
