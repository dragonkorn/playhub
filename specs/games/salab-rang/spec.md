# สลับร่าง spec

Status: accepted. Covers the rules, data and screens of สลับร่าง (English: Body Swap). Rooms, lobby, disconnects and host handling belong to the [platform spec](../../platform/spec.md). This game implements its `GameDefinition` contract.

สลับร่าง is a bluffing party game set at a Thai night market. Each phone is one face-down character card. Players secretly swap cards until nobody is sure who they are, then claim a character out loud to use its power, and anyone may challenge. Players talk and show their phones to the table; the app keeps the cards, coins and turns. Screens: [design canvas](https://claude.ai/artifact/XmYj8prqXqKD8xena1n7DG), copied to `design/salab-rang/`.

The game is original. Its cast, powers and win condition are its own; only the general idea of swapped hidden roles is shared with the genre.

## 1. Game setup

```ts
meta = { id: "salab-rang", minPlayers: 4, maxPlayers: 10, orientations: ["portrait", "landscape"] };
```

- **W1** The game has two options. `goal` is the coin target: 12, 15 (default) or 20. `set` picks the cards: `starter` (default), `chaos`, `random` or `custom`. With `custom`, `roles` lists the chosen characters.
- **W2** Each game uses as many cards as players, and no character appears twice. Whenever the pickpocket is in the game, the police is too.
- **W3** `starter` takes the first N of: vendor, seer, pickpocket, police, monk, magician, collector, dog, masseur, taxi.
- **W4** `chaos` always holds medium, gossip, taxi and magician, then the first N − 4 of: thug, police, pickpocket, collector, vendor, seer.
- **W5** `random` draws N characters from all 13 with the injected `random`. If it draws the pickpocket without the police, the police replaces one other drawn card, chosen with `random`.
- **W6** `custom` needs exactly N distinct characters that satisfy W2. Otherwise the game refuses to start with `deck_size` or `deck_police` (L11).
- **W7** Cards are shuffled with `random` and dealt one per player. Every player starts with 5 coins. The bank never runs out.
- **W8** Turn order is seat order, starting from the first seat. A round ends when every player still in the game has had one turn. The game lasts at most `ROUNDS = 4` rounds.

### Characters

| Id | Thai | Power |
|---|---|---|
| `vendor` | แม่ค้าส้มตำ | Gain 2. Pick a customer, who gains 1. |
| `pickpocket` | นักล้วงกระเป๋า | Take 2 from a player. If that player holds the police card, pay them 3 instead. |
| `police` | ตำรวจ | Look at a player's card. If it is the pickpocket, take 4 from them. |
| `seer` | หมอดู | Look at the cards of 2 other players. Gain 1. |
| `monk` | หลวงพี่ | Bless another player until the monk's player starts their next turn. Gain 1. |
| `magician` | นักมายากล | Every card moves to the next player in turn order. Gain 1. |
| `collector` | คนเก็บค่าที่ | Every player with more coins than you pays you 1. |
| `medium` | ร่างทรง | Pay 1, then use the power of another character in this game. |
| `gossip` | ป้าข้างแผงขี้เม้าท์ | Reveal a player's card to the table. Gain 1. |
| `thug` | นักเลงคุมซอย | Take 1 from a player. They can't claim on their next turn. |
| `masseur` | หมอนวด | Take 1 from a player. They privately look at their own card. |
| `taxi` | วินมอเตอร์ไซค์ | Move 2 coins from one player to another. Gain 1. |
| `dog` | หมาวัด | No power, can't be claimed. Gains 2 when revealed in a challenge. |

## 2. Memorize

- **W9** The game opens in `memorize`. Every player who hasn't hidden sees every card. Each player sends `{ type: "hide" }` once, after which they see no card at all.
- **W10** Every player who hasn't hidden is active. When the last one hides, the first turn starts.

## 3. Turns

On their turn, the current player does one of three things.

- **W11** **Swap**: `{ type: "swap", target, real }`. The target is another player in the game and not blessed. With `real: true` the two cards trade places, otherwise nothing changes. Nobody sees any card, including the swapper. Everyone sees that the swap happened, never whether it was real.
- **W12** **Peek**: `{ type: "peek" }`. The game enters `peek` and only the player sees their own card. `{ type: "done" }` ends the turn.
- **W13** **Claim**: `{ type: "claim", role }`. The role must be in this game and not the dog. A muted player can't claim (`muted`). The game enters `challenge`.

### Challenge

- **W14** In `challenge`, every other player in the game is active and answers `{ type: "respond", challenge }`, where `true` means "ฉันต่างหาก" and `false` means pass. A player can change their answer until the last missing answer arrives.
- **W15** Every view shows who has answered, never what they answered. A player's own answer is visible only to them.
- **W16** When every other player has answered, the challenge resolves at once:
  - With no challenger, the claimer uses the claimed power, whatever their card is.
  - With challengers, the claimer and every challenger reveal their cards. At most one of them holds the claimed role, because cards are unique. Each one without it pays a fine of 1. A revealed dog gains 2 on top. Then the game enters `reveal`.
- **W17** In `reveal`, the revealed cards are public. The true owner, if any, is active and sends `{ type: "continue" }` to use the power. With no true owner, the claimer is active and `continue` ends the turn. Revealed cards stay with their owners and go face down again.

### Powers

- **W18** The player using a power sends `{ type: "power", ... }` with the arguments in Section 5. Targets are other players still in the game, and a power naming two targets needs two different ones. Blessing blocks swaps only (W11, W19), never powers. The player may send `{ type: "done" }` instead to skip the power, which matters when no legal target is left.
- **W19** The magician moves cards one step along turn order, skipping blessed players: their cards stay put, and each other card goes to the next unblessed player.
- **W20** The medium pays 1 and names `as`, a role in this game other than medium or dog, plus that role's arguments. The effect is that role's power, used by the medium's player. A medium with 0 coins can't pay, and the power does nothing.
- **W21** Seer and police results are private to the user. The game enters `secret` and `{ type: "done" }` ends the turn. When the police finds the pickpocket, the 4 coins move in public.
- **W22** Gossip reveals the target's card to everyone. The game enters `shown` with the target active, and the target's `{ type: "continue" }` turns it face down and ends the turn.
- **W23** Masseur lets the target see their own card. The game enters `massage` with the target active, and the target's `{ type: "done" }` ends the turn.
- **W24** A player pays only what they have. Coins never go below 0. Fines and payments to the bank simply vanish.
- **W25** A blessing ends when the blessing player's next turn starts. Thug's mute ends when the muted player's next turn ends.

### End

- **W26** After each turn, the game ends if any player has at least `goal` coins, or if round 4 has finished. Players rank by coins, ties sharing a place. Players removed by the platform rank last, together.
- **W27** After the game ends, every card is visible to everyone, and every move is rejected with `wrong_phase`.

Rejection codes: `wrong_phase`, `bad_target`, `blessed`, `bad_role`, `muted`. Start codes: `deck_size`, `deck_police`. `not_your_turn` comes from the platform.

## 4. Lost players

- **W28** A removed player's card leaves the game. Claims of that role can still be made, and simply have no true owner.
- **W29** If the removed player is needed by the current phase, the phase continues without them: a missing answer no longer counts, and a turn, power or private look that belongs to them ends. Their blessings end.
- **W30** If fewer than 2 players remain, the game ends.

## 5. Data

```ts
type Role =
  | "vendor" | "pickpocket" | "police" | "seer" | "monk" | "magician" | "collector"
  | "medium" | "gossip" | "thug" | "masseur" | "taxi" | "dog";

type Options = {
  goal: 12 | 15 | 20;
  set: "starter" | "chaos" | "random" | "custom";
  /** Used only with `custom`. */
  roles: Role[];
};

type Power =
  | { role: "vendor"; customer: PlayerId }
  | { role: "pickpocket" | "police" | "monk" | "gossip" | "thug" | "masseur"; target: PlayerId }
  | { role: "seer"; targets: [PlayerId, PlayerId] }
  | { role: "magician" | "collector" }
  | { role: "taxi"; from: PlayerId; to: PlayerId }
  | { role: "medium"; as: Power };

type Move =
  | { type: "hide" }
  | { type: "swap"; target: PlayerId; real: boolean }
  | { type: "peek" }
  | { type: "claim"; role: Role }
  | { type: "respond"; challenge: boolean }
  | { type: "continue" }
  | { type: "power"; power: Power }
  | { type: "done" };

type Phase = "memorize" | "turn" | "peek" | "challenge" | "reveal" | "power" | "secret" | "shown" | "massage" | "finished";

/** Public history. Never holds a swap's `real` or a private look's result. */
type Event =
  | { kind: "swap"; player: PlayerId; target: PlayerId }
  | { kind: "peek"; player: PlayerId }
  | { kind: "claim"; player: PlayerId; role: Role; challengers: PlayerId[] }
  | { kind: "reveal"; cards: { player: PlayerId; role: Role; owner: boolean }[] }
  | { kind: "power"; player: PlayerId; role: Role; as?: Role; targets: PlayerId[]; caught?: boolean; found?: boolean; skipped?: boolean }
  | { kind: "gossip"; target: PlayerId; role: Role }
  | { kind: "coins"; changes: Record<PlayerId, number> };

type EndReason = "goal" | "rounds" | "players";

interface State {
  phase: Phase;
  options: Options;
  /** Every player who started, in seat order. */
  started: PlayerId[];
  /** Players still in the game, in turn order. */
  players: PlayerId[];
  out: PlayerId[];
  deck: Role[];
  cards: Record<PlayerId, Role>;
  coins: Record<PlayerId, number>;
  hidden: PlayerId[];
  round: number;
  current: PlayerId;
  claim: { player: PlayerId; role: Role } | null;
  answers: Record<PlayerId, boolean>;
  /** Who acts in reveal, power, secret, shown and massage. */
  actor: PlayerId | null;
  /** Cards the actor may see in `secret`. */
  looked: PlayerId[];
  /** Claimants whose cards are face up in `reveal`. */
  revealed: PlayerId[];
  /** Blessed player to the players who blessed them. */
  blessings: Record<PlayerId, PlayerId[]>;
  /** Players the thug has muted for their next turn. */
  muted: PlayerId[];
  /** The current player, when muted for this turn. */
  silenced: PlayerId | null;
  log: Event[];
  reason: EndReason | null;
}

interface View {
  phase: Phase;
  goal: number;
  round: number;
  rounds: number;
  order: PlayerId[];
  deck: Role[];
  coins: Record<PlayerId, number>;
  current: PlayerId | null;
  actor: PlayerId | null;
  claim: { player: PlayerId; role: Role } | null;
  /** Who has answered the current challenge. */
  answered: PlayerId[];
  /** The viewer's own answer, if any. */
  myAnswer: boolean | null;
  hidden: PlayerId[];
  blessed: PlayerId[];
  muted: PlayerId[];
  /** Exactly the cards this viewer may see right now. */
  cards: Record<PlayerId, Role>;
  log: Event[];
  reason: EndReason | null;
}
```

`outcome` ranks by coins (W26). `resultLine` is `result.<reason>`: the goal was reached, 4 rounds passed, or too few players remain.

## 6. What players see

`cards` in a view holds a card only when one of these holds:

| Case | Who sees which card |
|---|---|
| `memorize` | A viewer who hasn't hidden sees every card |
| `peek` | The current player sees their own card |
| `reveal` | Everyone sees the revealed cards |
| `secret` | The actor sees the cards in `looked` |
| `shown` | Everyone sees the target's card |
| `massage` | The target sees their own card |
| `finished` | Everyone sees every card |

Answers, a swap's `real` and private looks never reach another player. The test kit's secrets for a viewer are every card the table above hides from them, serialized as `"<playerId>":"<role>"`, the string `"real"`, and every other player's answer serialized as `"<playerId>":true` or `"<playerId>":false`.

## 7. Screens

The board lays out for a phone in portrait and an iPad in landscape, following the design canvas. A phone stands for one card: most of the screen is the card, and players hold it up to the table when it is revealed.

| Area | Shows |
|---|---|
| Top bar | `รอบ n/4`, the goal, history, character guide. The game has no sounds, so no mute |
| Player strip | One chip per player in turn order, starting from the viewer |
| Card | The viewer's card, face down unless the view holds it |
| Action area | The phase's buttons |

- **W31** Each chip shows the name, coins in large type, a connection dot, and icons for leader (crown), blessed (shield), muted (lock), not hidden (eye) and answered (check). The current player's chip has a thick orange ring. Coins within 3 of the goal turn orange.
- **W32** The strip fits 10 players without scrolling: 5 per row on a phone, one row on an iPad. Names longer than the chip end with "…".
- **W33** Target picking happens on the strip. Picked chips get a blue ring, a taxi's source an orange ring, and players who can't be picked are dimmed.
- **W34** Peeking and private looks need a hold: the card shows while the finger is down and turns over on release. A separate button ends the turn.
- **W35** In `challenge`, players who aren't the claimer see the claim, the count of answers, and two buttons: ฉันต่างหาก! and ผ่าน. The chosen button shows a check, and the other one stays tappable until everyone has answered.
- **W36** In `reveal`, `shown` and when the dog is revealed, the phone fills with the card and a large label: blue ตัวจริง, orange ตัวปลอม, with the fine and dog bonus. The screen asks the player to hold the phone up to the table.
- **W37** The muted player's claim button is disabled, with the reason above the actions.
- **W38** The magician's power shows every device a ring of players with the blessed ones marked as not moving.
- **W39** The history sheet lists public events, newest first. The guide sheet lists the characters in this game with their powers. Other players' screens show the latest 3 events while they wait, and the player whose turn starts sees the events since their last screen in a short banner.
- **W40** The lobby options panel shows the goal and the set. With `custom`, it opens a picker with all 13 characters, a count of chosen against needed, and the police rule. Non-hosts see the choice read-only.
- **W41** The result screen shows why the market closed, the winner, and every player's final card next to their coins.

## 8. Acceptance criteria

These run in Vitest against `logic` and the pure UI model, except the last.

1. Every set deals N unique cards for 4 to 10 players, always with police when the pickpocket is in, and 5 coins each. (W1 to W5, W7)
2. A custom deck of the wrong size or without police refuses to start with its code. (W6, L11)
3. The memorize view shows all cards until the viewer hides, then none. The first turn starts when everyone has hidden. (W9, W10)
4. A real swap trades cards, a fake one doesn't, and neither view nor log tells them apart. A swap with a blessed player gets `blessed`. (W11, W25)
5. Peek shows only the peeker's own card until `done`. (W12)
6. A claim of the dog or a role outside the deck gets `bad_role`, and a muted claim gets `muted`. (W13, W25)
7. Answers can change until the last one arrives, and views show who answered but not what. (W14, W15)
8. An unchallenged claim uses the power. A challenge fines every wrong claimant, pays a revealed dog 2, and lets the true owner use the power. (W16, W17)
9. Each of the 12 powers moves coins and cards as its row in Section 1 says, never below 0. (W18 to W24)
10. The magician skips blessed players. The medium pays 1 and uses the named power. (W19, W20)
11. Blessings and mutes expire at the right turn. (W25)
12. The game ends at the goal or after round 4, ranking by coins with ties shared. (W26)
13. Removing a player in each phase keeps the game able to finish. (W28 to W30)
14. A seeded random game always finishes and passes the platform test kit with every set. (G4)
15. Thai and English catalogs have the same keys and cover every role, event, rejection and start code. (I1, I2)
16. Manual on a real phone and iPad: hide, swap, hold to peek, claim, challenge and change the answer, reveal, each power, in Thai. (W31 to W41)

## 9. Delivery

Two steps, each passing the full test suite:

1. Core rules and the starter set: memorize, swap, peek, claim, challenge, reveal, and the 10 characters of W3. Options offer only `starter`.
2. Medium, gossip and thug, and the `chaos`, `random` and `custom` sets with the lobby picker and L11.
