# Four in a Row spec

Status: accepted. Covers the rules, data and screens of Four in a Row (Thai: เรียงสี่). Rooms, lobby, disconnects and host handling belong to the [platform spec](../../platform/spec.md). This game implements its `GameDefinition` contract.

The rules are the classic vertical four-in-a-row game. "Connect Four" is a Hasbro trademark, so the app never uses that name.

## 1. Game setup

```ts
meta = { id: "four-in-a-row", minPlayers: 2, maxPlayers: 2, device: "ipad", orientation: "landscape", localPlay: true };
```

- **F1** The board has 7 columns and 6 rows. Row 0 is the bottom row, column 0 is the left column.
- **F2** The game has no options. `parseOptions` accepts any object and returns `{}`.
- **F3** At setup, the server shuffles the two players with the injected `random`. The first player in `order` moves first and plays the yellow discs. The second plays red.

## 2. Play

- **F4** Exactly one player is active: the current player.
- **F5** A move names a column. The disc falls to the lowest empty row of that column, and the turn passes to the other player.
- **F6** A column outside 0 to 6 is rejected with `off_board`. A full column is rejected with `column_full`. Both keep the turn.
- **F7** A disc that completes 4 or more of one player's discs in a line, horizontal, vertical or diagonal, wins. The game ends at once.
- **F8** `line` holds every cell of every run of 4 or more through the winning disc, so a move that completes two lines lights up both.
- **F9** When the 42nd disc fills the board with no line, the game ends in a draw.
- **F10** After the game ends, every move is rejected with `wrong_phase`.

Rejection codes: `wrong_phase`, `off_board`, `column_full`. `not_your_turn` comes from the platform.

## 3. Lost players

- **F11** The platform calls `removePlayer` when a player is marked lost or leaves during play. The other player wins at once.
- **F12** A removal after the game has ended changes nothing.

## 4. What players see

There is no hidden information. Every player, and a watcher with no seat, gets the same view: the full drop log, whose turn it is, and the result. The test kit's secret list is empty.

## 5. Data

The drop log is the single source for the board, so playback and the board stay consistent.

```ts
type Options = Record<string, never>;

type Move = { type: "drop"; column: number };

interface Cell { row: number; column: number }

interface Drop { player: PlayerId; row: number; column: number }

interface State {
  phase: "playing" | "finished";
  /** Turn order. Index 0 plays yellow, index 1 plays red. */
  order: PlayerId[];
  current: PlayerId | null;
  drops: Drop[];
  winner: PlayerId | null;
  /** Winning cells, set only on a win by line. */
  line: Cell[] | null;
  /** Players who left the game. */
  out: PlayerId[];
}

type View = State;
```

`outcome` ranks the winner first and the other player second. A draw ranks both players together: `[[a, b]]`.

## 6. Screens

One screen, on an iPad in landscape, using the shared `GameLayout`:

| Area | Shows |
|---|---|
| Header | Whose turn it is, a hint, and the mute toggle |
| Left | Both players with their disc color, connection dot, and a highlight on the current player |
| Center | The board, with a drop row above it |
| Right | On your turn, the Drop button. Otherwise, the latest moves |

- **F13** On your turn, tapping anywhere in a column selects it, and a ghost disc in your color shows above that column. Drop confirms. Tapping another column moves the selection.
- **F14** Full columns can't be selected.
- **F15** Columns are labeled 1 to 7 for players and in the log.
- **F16** Yellow and red discs also differ by an inner mark, so players who can't tell the colors apart can still read the board.
- **F17** After the game, the board stays readable from the result screen's board button, with the winning line marked.

## 7. Move feedback

Everything here runs on the client, from the drop log. The server doesn't change.

- **F18** Every new drop plays in stages, one at a time, in log order:

| Stage | Time | Everyone |
|---|---|---|
| Fall | 0.15s + 0.05s per row fallen | The disc falls from the drop row into its cell |
| Land | 0.3s | Landing sound, the disc settles with a small bounce |
| Win | 2.2s | The winning cells pulse. A banner names the winner. The winner hears the win sound, everyone else the lose sound |
| Draw | 2.0s | A banner says it's a draw, with the draw sound |

- **F19** A disc stays hidden until it lands. The next player can act once playback ends on their device. A reconnecting device skips drops from before it reconnected. The last drop plays in full before the result screen, using the platform's `holdsFinish`.
- **F20** When your turn starts, a banner sweeps across the screen with a sound.
- **F21** There are 6 sounds: select, land, your turn, win, lose, draw. They play through the shared `SoundPlayer`, unlocked by the player's first tap. Mute uses the same device setting as other games.
- **F22** With the device's Reduce Motion setting on, the fall becomes a fade in place, the sweep becomes a fade, and the winning cells stay lit without pulsing.

## 8. Local play

Four in a Row has no hidden information, so it opts in to the platform's local play (O1).

- **F23** In local play, every text names the player instead of saying "you". The turn banner names the player whose turn starts, every turn, so the device can be passed across.
- **F24** In local play, the win moment plays the win sound.

## 9. Acceptance criteria

These run in Vitest against `logic` and the pure UI model, except the last.

1. Setup shuffles the two players with the injected random, and the first in `order` is current. (F3)
2. A drop lands on the lowest empty row, and the turn passes. (F5)
3. A column outside 0 to 6 gets `off_board`, and a full column gets `column_full`, and the turn stays. (F6)
4. Four in a row wins horizontally, vertically and on both diagonals. Three does not. (F7)
5. A move that completes two lines puts every cell of both in `line`. (F8)
6. Filling the board with no line is a draw ranked `[[a, b]]`. (F9)
7. Any move after the end gets `wrong_phase`. (F10)
8. Removing a player during play makes the other the winner, and removing after the end changes nothing. (F11, F12)
9. A seeded random game always finishes and passes the platform test kit. (G4)
10. Playback stages: a drop that wins plays fall, land, win. A drop that fills the board plays fall, land, draw. Fall time grows with the rows fallen. (F18)
11. The board as revealed during playback holds only drops that have landed. (F19)
12. Thai and English catalogs have the same keys and cover every rejection code. (I1, I2)
13. In local play, the header, log and turn banner name the player, and a whole game finishes on one device. (F23)
14. Manual on a real iPad: select, drop, sounds and the win banner work by touch, in Thai. (F13, F18 to F21)
