import type { GameDefinition, PlayerId } from "./index";

/** Small seeded generator (mulberry32), so test kit runs repeat exactly. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TestKitAdapter<State, Move, Options> {
  optionSets: Options[];
  playerCounts: number[];
  /** A legal move for an active player. */
  randomMove(state: State, player: PlayerId, random: () => number): Move;
  /** Strings that must not appear in this viewer's serialized view. */
  secrets(state: State, viewer: PlayerId): string[];
  maxMoves: number;
}

const playersOf = (count: number) => Array.from({ length: count }, (_, i) => `p${i}`);

function assertNoLeak<State, Move, View, Options>(
  game: GameDefinition<State, Move, View, Options>,
  adapter: TestKitAdapter<State, Move, Options>,
  state: State,
  players: readonly PlayerId[],
) {
  for (const viewer of players) {
    const json = JSON.stringify(game.viewFor(state, viewer));
    for (const secret of adapter.secrets(state, viewer)) {
      if (json.includes(secret)) throw new Error(`View for ${viewer} leaks ${secret}`);
    }
  }
}

/** Spec G4: every game must finish, survive JSON, and never leak secrets. */
export function runGameTestKit<State, Move, View, Options>(
  game: GameDefinition<State, Move, View, Options>,
  adapter: TestKitAdapter<State, Move, Options>,
  seed = 1,
): void {
  for (const options of adapter.optionSets) {
    for (const count of adapter.playerCounts) {
      const random = seededRandom(seed + count);
      const players = playersOf(count);
      let state = game.setup({ players, options, random });

      let moves = 0;
      while (!game.outcome(state).done) {
        if (++moves > adapter.maxMoves) throw new Error(`Game did not finish with ${count} players`);
        const active = game.activePlayers(state);
        const player = active[Math.floor(random() * active.length)];
        if (player === undefined) throw new Error("Unfinished game has no active player");

        const result = game.applyMove(state, player, adapter.randomMove(state, player, random), random);
        if (!result.ok) throw new Error(`Legal move rejected: ${result.code}`);

        const roundTrip = JSON.parse(JSON.stringify(result.state)) as State;
        if (JSON.stringify(roundTrip) !== JSON.stringify(result.state)) {
          throw new Error("State does not survive a JSON round trip");
        }
        state = roundTrip;
        assertNoLeak(game, adapter, state, players);
      }
    }
  }
}
