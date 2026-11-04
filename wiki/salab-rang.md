---
status: implemented
sources:
  - specs/games/salab-rang/spec.md
  - games/salab-rang/
  - design/salab-rang/
  - docs/changes/2026-11-04-salab-rang.md
---

# สลับร่าง

A bluffing party game for 4 to 10 players (English: Body Swap), set at a Thai night market. Each phone stands for one face-down character card. Players secretly swap cards until nobody is sure who they are, then claim a character out loud to use its power. Rules: [สลับร่าง spec](../specs/games/salab-rang/spec.md). Approved mockups: `design/salab-rang/`. Screenshots of the built screens: `docs/changes/2026-11-04-salab-rang.md`.

## Flow

1. **Deal:** one unique card per player from the host's set, and 5 coins each (W1 to W7). The sets live in `logic/meta.ts`.
2. **Memorize:** everyone sees every card, then taps hide. After hiding, a player sees no card at all (W9, W10).
3. **Turn:** swap with someone for real or as a bluff, peek at your own card, or claim a character (W11 to W13).
4. **Challenge:** everyone else answers ฉันต่างหาก or pass, and can change their mind until the last answer arrives. There is no timer, so the table has time to bluff (W14).
5. **Reveal:** claimants show their phones. The true owner uses the power, and wrong claims pay 1 (W16, W17).
6. **End:** someone reaches the coin goal, or 4 rounds pass. Most coins wins (W26).

The game moves through one phase per step, such as `challenge`, `reveal`, `power` or `secret`, and the platform waits on whoever `activePlayers` names. During a challenge that is every other player, so anyone can still change their answer (W14).

## Hidden information

The server holds every card. `viewFor` puts a card in `view.cards` only in the cases listed in spec section 6, such as the memorize phase, a peek or a public reveal. Whether a swap was real, other players' answers, and private looks by the seer, police and masseur never reach another player. The test kit checks this with secrets from `logic/test-adapter.ts`, which mirrors section 6 on its own (G4).

## Screens

`ui/model/board.ts` decides which screen a phone shows from the view, and builds the player strip and the history lines. `ui/model/pick.ts` turns taps on the strip into a power's targets. The page `ui/pages/PlayPage.tsx` holds what is still local: the chosen action, picks, and whether a finger is holding a card face up. Colors are the `sr-` tokens in `packages/ui/src/theme.css`.

Waiting phones show the latest 3 public events. The player whose turn starts sees the events since their last screen in a short banner, and a magician's power shows every phone a ring of players (W38, W39).

## Platform changes it brought

- A game can refuse a start for its options and player count, such as a custom set of the wrong size (L11). See [Room lifecycle](room-lifecycle.md).
- Player names stop at 10 characters, so they fit the player chip (R6).
