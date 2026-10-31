---
status: planned
sources:
  - specs/games/battleship/spec.md
---

# Battleship

Players each hide a fleet of 5 ships on a 10×10 board, then take turns firing. Last fleet afloat wins. Rules are in the [Battleship spec](../specs/games/battleship/spec.md).

## Flow

1. **Setup:** everyone places at once. Placement stays on the device until Ready, which is final (B4, B6).
2. **Battle:** turn order is shuffled, and one shot passes the turn, even on a hit (B7, B9).
3. **Finish:** one player left wins, and all fleets are revealed (B16).

## Targeting

The host picks a mode in the lobby (B2). `free` lets a player shoot anyone still in. `robin` forces the next player in turn order, recalculated each turn (B10, B11).

## Hidden information

Shot results are public, including sunk ship names (B20). A plain hit doesn't say which ship was hit, so `viewFor` must leave out unsunk positions and ship names on hits (B14). Eliminated players don't see other fleets, so they can't help friends still playing (B21).

## Connection to the platform

The game reports the active player, and the platform handles blocking and disconnects. See [Game plug-ins](game-plugins.md) and [Disconnects and host](disconnects-and-host.md). A lost player leaves the game with their fleet still hidden (B18).

The shot log is the only record of marks, ships left and eliminations, so those stay consistent.
