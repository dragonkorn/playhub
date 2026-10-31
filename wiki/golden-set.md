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
| 7 | What is the Connect Four board size? | `UNVERIFIED`. Connect Four rules aren't written yet. The answer must not be guessed. | None |
| 8 | How long does a turn timer last? | There is none. No timer skips a player. | `specs/platform/spec.md` T2 |
| 9 | Does a hit tell players which ship was hit? | No. Only a sunk result names the ship. | `specs/games/battleship/spec.md` B14 |
| 10 | Who is the target in round robin after an elimination? | The next player still in the game after the shooter. | `specs/games/battleship/spec.md` B11 |
| 11 | Is a move rejected as stale when another player reconnects? | No. It is stale only if older than when that player became active. | `apps/server/src/room/engine.ts`, `activeSince` |
| 12 | Why doesn't dragging use a library? | `@dnd-kit/react` is pre-1.0 with unverified iPad touch behavior, and the need is small. | `docs/adr/0004-pointer-events-for-ship-dragging.md` |
| 13 | How long is the grace period before the host decides? | 30 seconds. | `apps/server/src/room/engine.ts`, `GRACE_MS` |
| 14 | Has drag been tested on a real iPad? | `UNVERIFIED`. Only headless Chrome touch events so far. | `wiki/testing.md` |
| 15 | Does a returning player download the app again? | No. The service worker serves all build output and fonts. | `specs/platform/spec.md` C6 |
| 16 | Which players can switch boards? | Players waiting for their turn who aren't the shooter or target. Browsing shows only public data. | `specs/games/battleship/spec.md` B30, B31 |
| 17 | Is shot feedback in the live game yet? | No. Only a mockup exists. | `wiki/battleship.md` |
