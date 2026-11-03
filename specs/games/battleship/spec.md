# Battleship spec

Status: accepted. Covers the rules, data and screens of Battleship. Rooms, lobby, disconnects and host handling belong to the [platform spec](../../platform/spec.md). This game implements its `GameDefinition` contract.

Screens: `design/battleship-journey/`. Ship art: `design/assets/battleship/`.

## 1. Game setup

```ts
meta = { id: "battleship", minPlayers: 2, maxPlayers: 10, orientations: ["landscape"] };
```

- **B1** Every player gets a 10×10 board and the same 5 ships, whatever the player count.
- **B2** The host picks a targeting mode in the lobby: `free` (default) or `robin`.

| Ship | Id | Cells | Thai name |
|---|---|---|---|
| Carrier | `carrier` | 5 | เรือบรรทุกเครื่องบิน |
| Battleship | `battleship` | 4 | เรือประจัญบาน |
| Cruiser | `cruiser` | 3 | เรือลาดตระเวน |
| Submarine | `submarine` | 3 | เรือดำน้ำ |
| Destroyer | `destroyer` | 2 | เรือพิฆาต |

## 2. Setup phase

- **B3** All players place their fleets at the same time. Every player who isn't ready is active.
- **B4** Placement stays on the device until Ready. The draft is saved in device storage, so a reconnect keeps it. Shuffle runs on the client.
- **B5** Ready sends the whole fleet. It is valid when it has each ship exactly once, each ship is straight and inside the board, and no two ships share a cell. Ships may touch.
- **B6** Ready is final. A second `ready` is rejected with `already_ready`.
- **B7** When every remaining player is ready, the server shuffles turn order with the injected `random`, and battle starts.

## 3. Battle phase

- **B8** Exactly one player is active: the current player.
- **B9** The current player fires one shot at one cell on one opponent's board. The turn always passes after a valid shot, including on a hit.
- **B10** In `free` mode, the target can be any player still in the game.
- **B11** In `robin` mode, the target is the next player still in the game after the shooter in turn order. It is recalculated each turn, so an elimination closes the gap.
- **B12** Firing at a cell already shot on that board is rejected with `already_shot`, and the turn doesn't pass.
- **B13** A shot's result is `miss`, `hit` or `sunk`. A ship is sunk when all its cells are hit.
- **B14** A hit doesn't reveal which ship was hit. Only `sunk` names the ship.
- **B15** A player whose ships are all sunk is eliminated. They can't move, and they stay to watch.
- **B16** The game ends when one player is left in the game. That player wins.

Rejection codes: `wrong_phase`, `already_ready`, `invalid_fleet`, `invalid_target`, `off_board`, `already_shot`. `not_your_turn` comes from the platform.

## 4. Lost players

The platform calls `removePlayer` when a player is marked lost or leaves during play.

- **B17** In setup, the player is dropped, and B7 is checked again.
- **B18** In battle, the player leaves the game. If they were current, the turn passes to the next player. Their fleet stays hidden, and their board can't be targeted.
- **B19** B16 applies after every removal.

## 5. What players see

| Data | Own | Other players | After the game |
|---|---|---|---|
| Fleet positions, not sunk | Yes | Never | Everyone |
| Sunk ship: name and position | Yes | Yes | Everyone |
| All shots and results | Yes | Yes | Everyone |
| Ships left per player | Yes | Yes | Everyone |
| Who is ready | Yes | Yes | Everyone |

- **B20** Everyone sees every shot result on every board. Sunk ships are announced by name.
- **B21** Eliminated and lost players see the same as any other player. Their own fleet stays visible to them. Other fleets stay hidden until the game ends.
- **B22** A viewer with no seat in the game gets the same view with no own fleet.

The test kit's secret list for a state is the unsunk cells of every other player.

## 6. Data

The shot log is the single source for board marks, ships left and eliminations.

```ts
type ShipId = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";
type Orientation = "horizontal" | "vertical";

interface Placement { ship: ShipId; row: number; col: number; orientation: Orientation }

interface Options { targeting: "free" | "robin" }

type Move =
  | { type: "ready"; fleet: Placement[] }
  | { type: "fire"; target: PlayerId; row: number; col: number };

interface Shot {
  shooter: PlayerId;
  target: PlayerId;
  row: number;
  col: number;
  result: "miss" | "hit" | "sunk";
  ship?: ShipId; // only when sunk
}

interface State {
  phase: "setup" | "battle" | "finished";
  options: Options;
  fleets: Record<PlayerId, Placement[] | null>;
  turnOrder: PlayerId[];
  current: PlayerId | null;
  shots: Shot[];
  /** Players out of the game, in the order they left it. */
  out: PlayerId[];
}

interface View {
  phase: State["phase"];
  targeting: Options["targeting"];
  ready: PlayerId[];
  turnOrder: PlayerId[];
  current: PlayerId | null;
  /** Null unless the viewer may shoot. Set in robin mode. */
  forcedTarget: PlayerId | null;
  shots: Shot[];
  myFleet: Placement[] | null;
  sunk: Record<PlayerId, Placement[]>;
  shipsLeft: Record<PlayerId, number>;
  out: PlayerId[];
  /** Null until the game ends. */
  allFleets: Record<PlayerId, Placement[]> | null;
}
```

`outcome` ranks the winner first, then `out` in reverse order. The last player out places second.

## 7. Screens

| Screen | Behavior |
|---|---|
| Setup | Drag a ship onto the board, or drag a placed ship to move it. Tap a ship, then Rotate, or use Shuffle. Shows who is ready. |
| Your turn, free | Pick an opponent from the list, tap a cell, confirm with Fire. |
| Your turn, robin | Target is locked to `forcedTarget`. |
| Opponent's turn | Own fleet is large, with turn order and a shot log. |
| Eliminated | Shows the sunk fleet, with options to keep watching or leave. |

- **B23** Cells already shot can't be tapped.
- **B24** Final SVG art moves to `games/battleship/src/ui/assets/`. Ships rotate for vertical placement.
- **B25** Hit and miss differ by shape as well as color.
- **B26** Log text is built on the client from `Shot` data and translation codes.
- **B27** While dragging, the ship snaps to cells and shows whether the spot is valid, drawn offset so a finger doesn't hide it. A drop on an invalid spot returns the ship to where it was. Dragging must not scroll the page.
- **B28** Tapping a ship, then tapping a cell, also places it, for players who can't drag.
- **B29** Dragging uses browser Pointer Events directly (ADR-0004).

## 8. Shot feedback

Everything here runs on the client, from the shot log. Results are already public, so the server doesn't change.

- **B30** Shot camera: after every shot, every screen shows the target's board while the shot lands. The target stays on their own fleet. Afterwards, each screen returns to the board it was showing.
- **B31** A player who is waiting for their turn can browse any board. Browsing shows only public data: shots and sunk ships.
- **B32** A shot plays in stages:

| Stage | Time | Everyone | Target also |
|---|---|---|---|
| Flight | 0.6s | Launch and whistle sounds, shadow closing on the cell | Warning on the cell |
| Miss | 0.5s | Splash and ripple | None |
| Hit | 0.9s | Explosion and flash | Screen shake |
| Sunk | 1.8s | Ship turns to sunk art, banner names the ship | Bigger shake, red edge flash |
| Eliminated | 2.5s | Full-screen moment naming the player | The fleet sunk screen after it |

- **B33** Shots play one at a time, in log order. Results stay hidden until the shot lands. The next shooter can act once playback ends on their device. A reconnecting device skips shots from before it reconnected. The last shot plays in full before the result screen.
- **B34** When a player's turn starts, a banner sweeps across the screen with a sound.
- **B35** There are 8 sounds: aim, launch, whistle, splash, explosion, big explosion, your turn, eliminated. They play through the Web Audio API behind a `SoundPlayer` interface, unlocked by the player's first tap. Mute is per device and stays on a toggle in the game.
- **B36** With the device's Reduce Motion setting on, shake and sweep become fades.

## 9. Acceptance criteria

These run in Vitest against `logic`, except the last.

1. A fleet with a missing, duplicate, overlapping, off-board or diagonal ship gets `invalid_fleet`. (B5)
2. Touching ships are accepted. (B5)
3. A second `ready` gets `already_ready`. (B6)
4. Battle starts only when everyone is ready, with a seeded shuffle. (B7)
5. A hit and a miss both pass the turn. (B9)
6. In `robin` mode, a shot at anyone else gets `invalid_target`. (B11)
7. In `robin` mode, elimination moves the target to the next player left. (B11)
8. In `free` mode, shooting yourself or a player who is out gets `invalid_target`. (B10)
9. A repeat cell gets `already_shot`, and the turn stays. (B12)
10. A hit's shot data has no ship name, and the final hit on a ship has its name. (B13, B14)
11. Sinking a fifth ship eliminates the player, and the last player left wins. (B15, B16)
12. Removing the current player passes the turn. (B18)
13. Removing the only unready player in setup starts battle. (B17)
14. Removing one of two players ends the game. (B19)
15. A view never holds another player's unsunk cells during play. (B20 to B22)
16. Eliminated players still can't see other fleets. (B21)
17. After the game, every view has `allFleets`. (Section 5)
18. Ranking is winner first, then reverse order out. (Section 6)
19. A 10-player seeded random game finishes in both modes, and passes the platform test kit. (G4)
20. Manual on a real iPad: dragging, tap placement and firing work by touch, in Thai. (B27 to B29)
21. The first screen update after a shot queues one playback per new shot, in order, and skips shots from before a reconnect. (B33)
22. A non-target screen shows the target's board during playback, then returns. (B30)
23. A browsing player's view of another board holds no unsunk ship. (B31)
24. Mute persists across a reload. (B35)
25. Manual on a real iPad: sound plays after the first tap, and stays in step with the animation. (B32, B35)
