# Golden set

Questions for checking wiki accuracy. Answers and evidence come from sources, never from an earlier LLM answer. To test, answer each question using the wiki alone, then compare.

| # | Question | Expected answer | Evidence |
|---|---|---|---|
| 1 | Can a lost player return to the game? | No. They stay as a watcher. | `specs/platform/spec.md` D6, D7 |
| 2 | What happens on the server when the host taps Wait? | Nothing. It only dismisses the prompt. | `specs/platform/spec.md` D5 |
| 3 | Who becomes host if the host disconnects? | Next connected seat in seat order, after the grace period. | `specs/platform/spec.md` H2 |
| 4 | Why does the server send full snapshots? | Outgoing messages are free, and reconnect uses the same path. | `docs/adr/0003-full-snapshots-not-patches.md` |
| 5 | Why was boardgame.io rejected? | No Workers adapter, and no npm release since 2022. | `docs/adr/0001-hand-written-room-durable-object.md` |
| 6 | Can two players in one room use different languages? | Yes. Language is per device. | `specs/platform/spec.md` I4 |
| 7 | What is the Four in a Row board size? | 7 columns by 6 rows. | `specs/games/four-in-a-row/spec.md` F1 |
| 8 | How long does a turn timer last? | There is none. No timer skips a player. | `specs/platform/spec.md` T2 |
| 9 | Does a hit tell players which ship was hit? | No. Only a sunk result names the ship. | `specs/games/battleship/spec.md` B14 |
| 10 | Who is the target in round robin after an elimination? | The next player still in the game after the shooter. | `specs/games/battleship/spec.md` B11 |
| 11 | Is a move rejected as stale when another player reconnects? | No. It is stale only if older than when that player became active. | `apps/server/src/room/engine.ts`, `activeSince` |
| 12 | Why doesn't dragging use a library? | `@dnd-kit/react` is pre-1.0 with unverified iPad touch behavior, and the need is small. | `docs/adr/0004-pointer-events-for-ship-dragging.md` |
| 13 | How long is the grace period before the host decides? | 30 seconds. | `apps/server/src/room/engine.ts`, `GRACE_MS` |
| 14 | Has drag been tested on a real iPad? | `UNVERIFIED`. Only headless Chrome touch events so far. | `wiki/testing.md` |
| 15 | Does a returning player download the app again? | No. The service worker serves all build output and fonts. | `specs/platform/spec.md` C6 |
| 16 | Which players can switch boards? | Any player whose turn it isn't, between shots. Browsing shows only public data. | `specs/games/battleship/spec.md` B31, `games/battleship/src/ui/pages/BattlePage.tsx` |
| 17 | Can the next shooter act while a shot is playing? | No. They wait for playback on their own device. | `specs/games/battleship/spec.md` B33 |
| 18 | May an atom translate text? | No. Atoms and molecules take text through props. | `specs/platform/design-system.md` A2 |
| 19 | Is Storybook installed? | No. It is planned. | `specs/platform/storybook-plan.md` |
| 20 | Does the result screen always appear the moment a game ends? | No. A game with `holdsFinish` keeps its board until it calls `release`. | `packages/game-contract/src/index.ts`, `apps/web/src/pages/RoomPage.tsx` |
| 21 | Does mute survive leaving a room? | Yes. Leaving clears only that room's token and draft. | `apps/web/src/repositories/session-repository.ts`, `removeSession` |
| 22 | Does a device that reconnects replay the shots it missed? | No. It skips them. | `specs/games/battleship/spec.md` B33 |
| 23 | What does Reduce Motion change in Battleship? | Shake is off, and the turn banner fades. | `games/battleship/src/ui/fx.css` |
| 24 | Does the atomic rules test cover a new game automatically? | Yes. It lists every folder under `games/`. | `packages/ui/src/atomic-rules.test.ts`, `GAMES` |
| 25 | What happens when the client runs out of reconnect retries? | After 12 retries it stops and shows the room has ended. | `apps/web/src/model/use-room.ts`, `MAX_RETRIES` |
| 26 | Where will a built Storybook be hosted? | `UNVERIFIED`. It is an open question. The answer must not be guessed. | `specs/platform/storybook-plan.md` |
| 27 | Why does the app say เรียงสี่ and never "Connect Four"? | "Connect Four" is a Hasbro trademark. | `specs/games/four-in-a-row/spec.md`, intro |
| 28 | How is a full Four in a Row board with no line ranked? | A draw: both players share first place. | `specs/games/four-in-a-row/spec.md` F9, `games/four-in-a-row/src/logic/index.ts` |
| 29 | Can Battleship be played on one device? | No. Only games with no hidden information may opt in to local play. | `specs/platform/spec.md` O1 |
| 30 | Does local play need a network connection? | No. The browser runs the game's rules. | `specs/platform/spec.md` O3, `docs/adr/0006-local-play-runs-logic-in-the-browser.md` |
| 31 | Does a reload lose a local game in progress? | No. It is saved on the device after every move. | `specs/platform/spec.md` O6, `apps/web/src/repositories/session-repository.ts` |
| 32 | What does the result screen show when players tie for first? | It says it's a draw, and tied players share a place. | `specs/platform/spec.md` L6, `apps/web/src/organisms/RankingList.tsx` |
| 33 | Have the Four in a Row sounds been checked on a real iPad? | `UNVERIFIED`. Only generated and played in headless Chrome. | `wiki/testing.md` |
