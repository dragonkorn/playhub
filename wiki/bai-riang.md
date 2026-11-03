---
status: implemented
sources:
  - specs/games/bai-riang/spec.md
  - games/bai-riang/
  - design/bai-riang/
  - design/assets/bai-riang/build-sounds.mjs
---

# ใบ้เรียง

A cooperative party game for 2 to 10 players (English: Hint in Order). Each player gets secret numbers from 1 to 100, the team gets a topic such as "สัตว์ที่น่ากลัว", players hint at their numbers by talking outside the app, then reveal from low to high. The app only replaces the cards: it deals, shows the topic, takes reveals and counts lives. Rules: [ใบ้เรียง spec](../specs/games/bai-riang/spec.md). Approved mockups: `design/bai-riang/`.

## Flow

1. **Setup:** 3 levels and 3 shared lives. Level `n` deals `n` numbers to each player, all different (N2, N3).
2. **Topic:** a lobby option. `random` draws a topic each level, never repeated in one game, and anyone can draw a new one until the first reveal. `agreed` shows a plain 1 to 100 scale, and players pick a topic themselves (N1, N4, N11).
3. **Reveal:** there are no turns. Anyone holding a number may reveal, and a reveal is always their lowest one. The move names the number, so a repeated tap can't reveal the next (N5, N6).
4. **Mistake:** any lower number still out is skipped and discarded, at 1 life each (N7). Out of lives loses at once (N8).
5. **Next level:** when every number is out, anyone presses Next. Clearing level 3 wins (N9, N10).

A player who leaves loses their numbers without costing a life (N13). The outcome is a team result, `team: "won"` or `"lost"`, with everyone ranked together (L8, [Room lifecycle](room-lifecycle.md)).

## Hidden information

`viewFor` gives each player only their own numbers, a count per player, and the public reveals. The test kit's secret for a viewer is every other player's hand. Topic text lives only in the UI: `ui/topics.ts` holds 200 topics, and the logic knows only `TOPIC_COUNT` and picks an index. A test checks the two counts match.

## Screen

The first game with a phone layout. It lists both orientations, so a phone plays in the portrait frame and an iPad in landscape ([Screens and frames](screens-and-frames.md)). The screen shows only what a card would: level, lives, topic, a large card for the next number, a strip with one slot per number, and the reveal button. Every level keeps the same layout (N15).

- **Hold to reveal:** a 1 second hold, with a bar filling along the button. Letting go early cancels (N16). `model/hold.ts` holds the timing, `model/use-hold.ts` runs it.
- **Hide:** covers the number for players sitting side by side, and stays on as a device preference (N17).
- **People sheet:** the people button opens who is connected, how many numbers each holds, and this level's reveals (N18).

## Feedback

`model/feedback.ts` compares each view with the last one: a flip sound per reveal, a mistake banner for 2.5s, and clear, win or lose sounds. A first view plays nothing, so a reconnecting device skips old reveals. The game sets `holdsFinish` and gives the result line through `resultLine` (N20 to N22). There are 5 sounds from `design/assets/bai-riang/build-sounds.mjs`. CSS classes start with `br-`.
