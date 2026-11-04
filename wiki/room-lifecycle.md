---
status: implemented
sources:
  - specs/platform/spec.md
  - apps/server/src/room/engine.ts
  - apps/web/src/pages/
  - apps/web/src/model/name.ts
---

# Room lifecycle

A room moves through `lobby`, `playing` and `finished`. Play again returns it to `lobby` with the same code. Any phase ends in deletion after inactivity (spec R8).

## Getting in

The host picks a game on the home page, which lists every registered game (C7), and creates a room (R1). Games sit in a two-column grid that scrolls when there are many, so the name field and buttons always stay on screen (C8). Others join by code or QR link (R4). Joining can fail for coded reasons (R5).

There are no accounts. Each player holds a secret seat token on their device, which reclaims their seat when they return (S1, S2). The token is never sent to other players (S3).

## Starting

Only the host starts, and every seat must be connected (L1). The host can remove a seat in the lobby, so a missing player can't block the start (L5). Options belong to the game, and the host sets them in the lobby (L2).

A game may also refuse a start for its options and the seated count, such as a custom [สลับร่าง](salab-rang.md) set of the wrong size (L11). The server rejects the start, and puts the reason in each lobby snapshot as `startError`, because the browser can't run game logic. The lobby then disables Start and shows the game's message. On a phone, the lobby's right column scrolls, so 10 players and a game's options still fit.

Names are 1 to 10 characters, counting a Thai letter and its marks as one (R6). The server checks this, and name fields stop taking input at the limit (`apps/web/src/model/name.ts`).

## Playing and finishing

The platform has no turn logic. It asks the game who it's waiting for (T1). When the game reports it's done, the room moves to `finished`, and the result screen appears once the game lets it ([Game plug-ins](game-plugins.md)). It names the winner, or says it's a draw when players tie for first, and tied players share a place in the ranking (L6). The line above the result comes from the game's catalog, `result.win` or `result.draw` (L7). A cooperative game such as [ใบ้เรียง](bai-riang.md) ends as a team instead: the screen says the team won or lost, lists players without places, and takes its line from the game's `resultLine` (L8, L9). The wording lives in `apps/web/src/model/result.ts`. From there, players can reopen the final boards, with a back button at the bottom center (L10).

If a player drops, see [Disconnects and host](disconnects-and-host.md).

Room rules live in `apps/server/src/room/engine.ts`. Screens live in `apps/web/src/pages/`.

A game can also be played on one device with no room at all. See [Local play](local-play.md).

Full rules: [platform spec](../specs/platform/spec.md), sections 2 to 5.
