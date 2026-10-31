---
status: planned
sources:
  - specs/platform/spec.md
---

# Room lifecycle

A room moves through `lobby`, `playing` and `finished`. Play again returns it to `lobby` with the same code. Any phase ends in deletion after inactivity (spec R8).

## Getting in

The host creates a room (R1). Others join by code or QR link (R4). Joining can fail for coded reasons (R5).

There are no accounts. Each player holds a secret seat token on their device, which reclaims their seat when they return (S1, S2). The token is never sent to other players (S3).

## Starting

Only the host starts, and every seat must be connected (L1). The host can remove a seat in the lobby, so a missing player can't block the start (L5). Options belong to the game, and the host sets them in the lobby (L2).

## Playing and finishing

The platform has no turn logic. It asks the game who it's waiting for (T1). When the game reports it's done, the room moves to `finished`.

If a player drops, see [Disconnects and host](disconnects-and-host.md).

Full rules: [platform spec](../specs/platform/spec.md), sections 2 to 5.
