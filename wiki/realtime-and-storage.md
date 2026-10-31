---
status: planned
sources:
  - specs/platform/spec.md
  - specs/research/realtime-server.md
  - docs/adr/0001-hand-written-room-durable-object.md
  - docs/adr/0003-full-snapshots-not-patches.md
---

# Realtime and storage

Each room is one Durable Object, written directly on Cloudflare's API ([ADR-0001](../docs/adr/0001-hand-written-room-durable-object.md)). Room logic is a pure engine, and the Durable Object is a thin shell around it, so the logic tests without Cloudflare.

## A move, step by step

1. The client sends a move with the version it last saw.
2. The room loads its record, because memory may have been cleared (V3).
3. It rejects bad input, a wrong player, or an old version (P2, P3).
4. The game applies the move, and the room saves one record.
5. Every connected player gets a full snapshot built for them ([ADR-0003](../docs/adr/0003-full-snapshots-not-patches.md)).

## Why hibernation matters

Rooms sleep between messages while sockets stay open. Without this, the free tier covers about 37 games a day instead of hundreds, so V1 to V4 aren't optional. Writes are the tightest limit, which is why a room keeps one row per record.

Client reconnection comes from `partysocket`. Terminal closes use codes the client won't retry (P4).

Evidence: [research](../specs/research/realtime-server.md). Protocol: [platform spec](../specs/platform/spec.md), sections 9 and 10.
