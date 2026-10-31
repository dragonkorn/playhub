---
status: implemented
sources:
  - specs/platform/spec.md
  - specs/research/realtime-server.md
  - docs/adr/0001-hand-written-room-durable-object.md
  - docs/adr/0002-single-worker-hosting.md
  - docs/adr/0003-full-snapshots-not-patches.md
  - apps/server/src/room/
  - apps/server/src/repositories/
  - apps/server/src/index.ts
  - apps/server/wrangler.jsonc
  - apps/web/src/model/use-room.ts
  - apps/web/src/repositories/
---

# Realtime and storage

Each room is one Durable Object, written directly on Cloudflare's API ([ADR-0001](../docs/adr/0001-hand-written-room-durable-object.md)). Room logic is a pure engine, and the Durable Object is a thin shell around it, so the logic tests without Cloudflare.

## A move, step by step

1. The client sends a move with the version it last saw.
2. The room loads its record, because memory may have been cleared (V3).
3. It rejects bad input, a wrong player, or a move older than when that player became active (P2, P3). Unrelated changes, such as someone reconnecting or another player tapping Ready, never make a move stale.
4. The game applies the move, and the room saves one record.
5. Every connected player gets a full snapshot built for them ([ADR-0003](../docs/adr/0003-full-snapshots-not-patches.md)).

## Why hibernation matters

Rooms sleep between messages while sockets stay open. Without this, the free tier covers about 37 games a day instead of hundreds, so V1 to V4 aren't optional. Writes are the tightest limit, which is why a room keeps one row per record.

Storage sits behind `RoomRepository`, with a Durable Object adapter and an in-memory adapter for tests. One Worker also serves the web build ([ADR-0002](../docs/adr/0002-single-worker-hosting.md)).

Client reconnection comes from `partysocket`. Terminal closes use codes the client won't retry (P4).

Evidence: [research](../specs/research/realtime-server.md). Protocol: [platform spec](../specs/platform/spec.md), sections 9 and 10.
