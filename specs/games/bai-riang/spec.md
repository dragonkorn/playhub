# ใบ้เรียง spec

Status: accepted. Covers the rules, data and screens of ใบ้เรียง (English: Hint in Order). Rooms, lobby, disconnects and host handling belong to the [platform spec](../../platform/spec.md). This game implements its `GameDefinition` contract.

ใบ้เรียง replaces the cards of a cooperative number-ordering party game. Players talk and give hints outside the app. The app deals secret numbers, shows the topic, takes each reveal and keeps the lives. Screens: [design canvas](https://claude.ai/artifact/U4UUqVmZ1jDyCjcFeXZcPQ), copied to `design/bai-riang/`.

## 1. Game setup

```ts
meta = { id: "bai-riang", minPlayers: 2, maxPlayers: 10, orientations: ["portrait", "landscape"] };
```

- **N1** The game has one option, `topics`: `random` (default) or `agreed`. With `random`, the game picks each level's topic and every player sees it. With `agreed`, players choose a topic among themselves and the app shows a generic 1 to 100 scale.
- **N2** The game has 3 levels and the team shares 3 lives. Level `n` deals `n` numbers to each player.
- **N3** Each level deals numbers from 1 to 100 with the injected `random`. No number repeats within a level. Each player's numbers are kept in ascending order.
- **N4** The topic catalog has `TOPIC_COUNT` topics, identified by index. Text lives in the UI catalog. With `random`, each level draws a topic that hasn't been used in this game.

## 2. Play

- **N5** While a level is playing, every player who still holds a number is active. Players reveal in any order, at any time.
- **N6** A play names the card being revealed: `{ type: "play", card }`. It must be the player's lowest unrevealed number, otherwise it is rejected with `not_your_card`. Naming the card stops a queued or repeated tap from revealing the next number.
- **N7** When a revealed number is higher than other unrevealed numbers, every one of those lower numbers is revealed as skipped and removed. The team loses 1 life per skipped number.
- **N8** When lives reach 0, the game ends at once and the team loses.
- **N9** When every number of a level is revealed or skipped and lives remain, the level is cleared. After level 3, the team wins.
- **N10** After a cleared level, any player can start the next one: `{ type: "next", level }`, where `level` is the level that starts. A repeat or a stale level is rejected with `wrong_phase`. Every player stays active while the level is cleared.
- **N11** With `random`, any player can draw a new topic, `{ type: "reroll", level }`, until the first reveal of the level. After it, or with `agreed`, a reroll is rejected with `wrong_phase`. When no unused topic remains, a reroll is rejected with `no_topics`.
- **N12** After the game ends, every move is rejected with `wrong_phase`.

Rejection codes: `wrong_phase`, `not_your_card`, `no_topics`. `not_your_turn` comes from the platform.

## 3. Lost players

- **N13** When a player is removed, their unrevealed numbers are discarded without losing a life, and the game continues. If that empties the level, it is cleared, or won after level 3.
- **N14** If no player remains, the game ends and the team loses. A removal after the end changes nothing.

## 4. What players see

Each player sees their own numbers. Other players' unrevealed numbers stay on the server. Reveals and skips are public, with the owner of each number.

The test kit's secrets for a viewer are the other players' unrevealed hands, serialized as the view would hold them.

## 5. Data

```ts
type Options = { topics: "random" | "agreed" };

type Move =
  | { type: "play"; card: number }
  | { type: "next"; level: number }
  | { type: "reroll"; level: number };

interface Reveal { player: PlayerId; card: number; skipped: { player: PlayerId; card: number }[] }

interface State {
  phase: "playing" | "cleared" | "finished";
  options: Options;
  /** Players still in the game, in seat order. */
  players: PlayerId[];
  level: number;
  lives: number;
  /** Topic index, or null with `agreed`. */
  topic: number | null;
  used: number[];
  /** Numbers dealt this level, ascending, including revealed ones. */
  dealt: Record<PlayerId, number[]>;
  /** This level's reveals, in order. */
  reveals: Reveal[];
  out: PlayerId[];
  won: boolean | null;
}

interface View {
  phase: State["phase"];
  topics: Options["topics"];
  level: number;
  lives: number;
  topic: number | null;
  /** The viewer's own numbers this level, ascending. Empty for a watcher. */
  mine: number[];
  /** Unrevealed count per player. */
  left: Record<PlayerId, number>;
  reveals: Reveal[];
  won: boolean | null;
}
```

`outcome` ranks every player who started together, `[[...players]]`, with `team: "won"` or `team: "lost"` (L8).

## 6. Screens

The board lays out for a phone in portrait and an iPad in landscape, following the design canvas. Players talk outside the app, so the screen shows only what the cards would show.

| Area | Shows |
|---|---|
| Top bar | Level as `n/3`, lives as hearts, the people button with the player count, mute |
| Topic | The topic title with what 1 and 100 mean. With `random`, a reroll button until the first reveal |
| Hand | One large card for the next number, and below it a strip with one slot per number dealt |
| Reveal | A hold-to-reveal button, always in the same place |

- **N15** Every level uses the same layout: the large card and the strip keep their size and place, and the strip has 1, 2 or 3 slots. The next number has a yellow ring in the strip. Revealed and skipped numbers are dimmed and struck through, revealed ones with a check.
- **N16** Revealing needs a 1 second hold on the reveal button. A bar along the button's bottom edge fills while holding. Releasing early cancels, and the button says so. The button names the number, and below it, which number of how many: "ใบที่ 2 จาก 3".
- **N17** Hide covers the large card and the strip in the same space, and stays on across levels until the player shows it again. It is kept in the device's preferences. While hidden, the reveal button says "your number" instead of the number.
- **N18** The people button opens a sheet with every player, their connection dot and unrevealed count, and this level's reveals with names. It closes with its close button or by tapping outside. It covers the screen without moving the hand or the reveal button.
- **N19** A cleared level shows "ผ่านด่าน n", the lives left, how many numbers the next level deals, and a Next level button.
- **N20** After the game, the result screen shows the team result (L8) with the game's line (L9), "ผ่านครบ 3 ด่าน" or "ชีวิตหมดที่ด่าน n". Its board button opens the final level's reveals.

## 7. Move feedback

Everything here runs on the client, from the reveal log. The server doesn't change.

- **N21** Every new reveal plays on every device: a flip sound and the number in the sheet. A reveal that skips numbers shows a mistake banner for 2.5s: who revealed what, the skipped numbers with their owners, and the lives lost, with the mistake sound. When the viewer's own number was skipped, the banner says so.
- **N22** A cleared level plays the clear sound. The last reveal plays in full before the result screen, using `holdsFinish`, with the win or lose sound.
- **N23** There are 5 sounds: reveal, mistake, clear, win, lose. They play through the shared `SoundPlayer`. Mute uses the same device setting as other games.
- **N24** With Reduce Motion on, the hold bar still fills, because it shows progress, and banners fade instead of moving.

## 8. Acceptance criteria

These run in Vitest against `logic` and the pure UI model, except the last.

1. Setup deals 1 number per player, unique and ascending, with 3 lives, at level 1, and draws a topic only with `random`. (N1 to N4)
2. A play of the lowest number reveals it. A play of any other number gets `not_your_card`. (N6)
3. A reveal above other unrevealed numbers skips them all and costs 1 life each. (N7)
4. Losing the last life ends the game with `team: "lost"`. (N8)
5. Revealing every number clears the level, and Next deals `level` numbers each with a new topic. A repeat Next gets `wrong_phase`. (N9, N10)
6. Clearing level 3 ends the game with `team: "won"`. (N9)
7. Reroll draws an unused topic before the first reveal, and gets `wrong_phase` after it or with `agreed`. Topics never repeat within a game. (N4, N11)
8. Removing a player discards their numbers without losing a life, and can clear or win the level. Removing everyone loses. (N13, N14)
9. A view holds only the viewer's own numbers and public reveals. (Section 4)
10. A seeded random game always finishes and passes the platform test kit. (G4)
11. The hold model fires only after 1 second, and an early release cancels. (N16)
12. Thai and English catalogs have the same keys, cover every rejection code, and hold every topic. (I1, I2, N4)
13. Manual on a real phone and iPad: hold to reveal, hide, the sheet and sounds work by touch, in Thai. (N15 to N23)
