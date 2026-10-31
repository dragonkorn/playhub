---
status: implemented
sources:
  - specs/platform/spec.md
  - apps/server/src/room/engine.ts
  - apps/web/src/organisms/DisconnectPanel.tsx
  - design/battleship-journey/project/Reconnecting.dc.html
---

# Disconnects and host

Three separate ideas work together here. Keeping them apart explains most behavior.

- **Connection** is `online` or `reconnecting`, and changes the moment a socket closes (D2).
- **Grace period** delays any decision, so an iPad sleeping briefly raises no prompt (D3).
- **Blocking** happens when the game is waiting on someone who is disconnected (T2). No timer skips a player.

## What the host sees

After the grace period, if the game is blocked on that player, the host chooses Wait or Mark as lost (D4). Wait changes nothing on the server, since blocking is already the default (D5). Mark as lost is permanent, and the player returns only as a watcher (D6, D7).

## When the host drops

The role moves to the next connected seat after the grace period (H2). A returning former host doesn't get it back (H4). If everyone is offline, the first to return becomes host (H3).

Eliminated and lost players can hold the role, because they may still be watching.

`DisconnectPanel` shows these choices on top of any game, so games need no disconnect code.

Full rules: [platform spec](../specs/platform/spec.md), sections 6 and 7.
