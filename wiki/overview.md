---
status: implemented
sources:
  - readme.md
  - specs/README.md
  - package.json
  - pnpm-workspace.yaml
  - apps/web/public/_headers
  - apps/web/vite.config.ts
  - apps/web/
  - apps/server/
  - packages/game-contract/
  - packages/ui/
  - games/battleship/
  - games/four-in-a-row/
  - games/bai-riang/
  - docs/adr/0007-two-fixed-frames-by-orientation.md
  - docs/adr/0006-local-play-runs-logic-in-the-browser.md
  - docs/adr/0002-single-worker-hosting.md
---

# Overview

PlayHub lets friends play a board game across devices with a room code and no accounts. A server acts as referee, and each device sees only what its player may see.

## Parts

- `apps/web`: the React PWA. Shows platform screens and each game's board. Holds no game rules.
- `apps/server`: one Cloudflare Worker. Serves the web build and the API, and runs one Durable Object per room ([ADR-0002](../docs/adr/0002-single-worker-hosting.md)).
- `packages/game-contract`: the shared types both sides and every game depend on.
- `packages/ui`: shared design system. See [Design system](design-system.md).
- `games/<game>`: one folder per game, split into `logic` and `ui`. Three exist: [Battleship](battleship.md), [Four in a Row](four-in-a-row.md) and [ใบ้เรียง](bai-riang.md).

Screens use a landscape or a portrait frame, so the app runs on iPads and phones. See [Screens and frames](screens-and-frames.md).

## Dependency direction

Apps depend on games. Games depend on `game-contract` and `packages/ui`, never on the platform (A7). The platform names a game only in its two registration files. The home page lists every registered game (C7). See [Game plug-ins](game-plugins.md).

## Where a request goes

A device sends a move over WebSocket. The room validates it, applies the game's rules, saves, then sends each player a personal snapshot. See [Realtime and storage](realtime-and-storage.md).

The one exception is [Local play](local-play.md): everyone shares one device, and the browser runs the game's rules with no server ([ADR-0006](../docs/adr/0006-local-play-runs-logic-in-the-browser.md)).

## Caching

After the first visit, players download no app assets (C6). The service worker holds all build output, and fonts once used. Files under `/assets/` have hashed names and are `immutable` for a year, while HTML revalidates, so a deploy downloads only what changed. Include any new asset type in `globPatterns` in `apps/web/vite.config.ts`. `apps/web/index.html` links `icon.svg` as the page icon, so the browser never asks the network for `favicon.ico`, which would fail offline. The room connection is live data, so it isn't cached.

## Running it

`pnpm deploy` builds the web app and deploys the Worker. To see how this is tested, read [Testing](testing.md).
