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
