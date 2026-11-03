import { runGameTestKit, seededRandom } from "@playhub/game-contract/testing";
import { describe, expect, it } from "vitest";
import { COLUMNS, ROWS, isFull } from "./board";
import { fourInARow } from "./index";
import type { Move, State } from "./types";

const random = seededRandom(7);

/** A fresh game with turn order fixed to a, then b. */
const start = (): State => ({ ...fourInARow.setup({ players: ["a", "b"], options: {}, random }), order: ["a", "b"], current: "a" });

const drop = (column: number): Move => ({ type: "drop", column });

function apply(state: State, player: string, move: Move): State {
  const result = fourInARow.applyMove(state, player, move, random);
  if (!result.ok) throw new Error(result.code);
  return result.state;
}

/** Plays the columns in order, each by whoever is current. */
const play = (columns: number[], state = start()) =>
  columns.reduce((next, column) => apply(next, next.current ?? "", drop(column)), state);

const rejection = (state: State, player: string, move: Move) => {
  const result = fourInARow.applyMove(state, player, move, random);
  return result.ok ? null : result.code;
};

/** Fills the board with no line. Colors alternate up each column, and run in pairs across. */
const DRAW = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 4, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 5];

describe("setup", () => {
  it("has a 7 by 6 board and no options (F1, F2)", () => {
    expect([COLUMNS, ROWS]).toEqual([7, 6]);
    expect(fourInARow.parseOptions({ anything: 1 })).toEqual({});
    expect(fourInARow.parseOptions("nope")).toBeNull();
  });

  it("shuffles the players with the injected random, and the first is current (F3)", () => {
    const orders = new Set<string>();
    for (let seed = 1; seed < 20; seed++) {
      const state = fourInARow.setup({ players: ["a", "b"], options: {}, random: seededRandom(seed) });
      expect(state.current).toBe(state.order[0]);
      orders.add(state.order.join());
    }
    expect([...orders].sort()).toEqual(["a,b", "b,a"]);
  });
});

describe("play", () => {
  it("has only the current player active (F4)", () => {
    expect(fourInARow.activePlayers(start())).toEqual(["a"]);
  });

  it("drops to the lowest empty row and passes the turn (F5)", () => {
    const state = play([3, 3]);
    expect(state.drops).toEqual([
      { player: "a", row: 0, column: 3 },
      { player: "b", row: 1, column: 3 },
    ]);
    expect(state.current).toBe("a");
  });

  it("rejects a column off the board, and keeps the turn (F6)", () => {
    expect(rejection(start(), "a", drop(-1))).toBe("off_board");
    expect(rejection(start(), "a", drop(7))).toBe("off_board");
  });

  it("rejects a full column, and keeps the turn (F6)", () => {
    const full = play([2, 2, 2, 2, 2, 2]);
    expect(isFull(full.drops, 2)).toBe(true);
    expect(rejection(full, "a", drop(2))).toBe("column_full");
  });

  it("parses only drop moves with a whole column", () => {
    expect(fourInARow.parseMove({ type: "drop", column: 4 })).toEqual(drop(4));
    expect(fourInARow.parseMove({ type: "drop", column: 1.5 })).toBeNull();
    expect(fourInARow.parseMove({ type: "fire", column: 1 })).toBeNull();
    expect(fourInARow.parseMove(null)).toBeNull();
  });
});

describe("winning", () => {
  it("wins with four across (F7)", () => {
    const state = play([0, 0, 1, 1, 2, 2, 3]);
    expect(state.phase).toBe("finished");
    expect(state.winner).toBe("a");
    expect(state.current).toBeNull();
    expect(fourInARow.activePlayers(state)).toEqual([]);
  });

  it("wins with four up (F7)", () => {
    expect(play([5, 0, 5, 0, 5, 0, 5]).winner).toBe("a");
  });

  it("wins on a rising diagonal (F7)", () => {
    expect(play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]).winner).toBe("a");
  });

  it("wins on a falling diagonal (F7)", () => {
    expect(play([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]).winner).toBe("a");
  });

  it("does not win with three (F7)", () => {
    const state = play([0, 0, 1, 1, 2, 2]);
    expect(state.phase).toBe("playing");
    expect(state.line).toBeNull();
  });

  it("puts every cell of every line through the winning disc in line (F8)", () => {
    // The last disc at row 0, column 3 ends a run across and a falling diagonal up to row 3, column 0.
    const state = play([0, 0, 1, 1, 2, 0, 2, 6, 1, 6, 0, 6, 3]);
    expect(state.winner).toBe("a");
    const cells = (state.line ?? []).map((c) => `${c.row},${c.column}`).sort();
    expect(cells).toEqual(["0,0", "0,1", "0,2", "0,3", "1,2", "2,1", "3,0"].sort());
  });

  it("ranks the winner first (F7)", () => {
    expect(fourInARow.outcome(play([0, 0, 1, 1, 2, 2, 3]))).toEqual({ done: true, ranking: [["a"], ["b"]] });
  });

  it("ends in a draw when the board fills with no line (F9)", () => {
    const state = play(DRAW);
    expect(state.drops).toHaveLength(42);
    expect(state.phase).toBe("finished");
    expect(state.winner).toBeNull();
    expect(fourInARow.outcome(state)).toEqual({ done: true, ranking: [["a", "b"]] });
  });

  it("rejects any move after the end (F10)", () => {
    const state = play([0, 0, 1, 1, 2, 2, 3]);
    expect(rejection(state, "a", drop(4))).toBe("wrong_phase");
    expect(rejection(state, "b", drop(4))).toBe("wrong_phase");
  });
});

describe("lost players", () => {
  it("makes the other player win at once (F11)", () => {
    const state = fourInARow.removePlayer(play([3]), "a", random);
    expect(state.winner).toBe("b");
    expect(state.out).toEqual(["a"]);
    expect(fourInARow.eliminatedPlayers(state)).toEqual(["a"]);
    expect(fourInARow.outcome(state)).toEqual({ done: true, ranking: [["b"], ["a"]] });
  });

  it("changes nothing after the end (F12)", () => {
    const finished = play([0, 0, 1, 1, 2, 2, 3]);
    expect(fourInARow.removePlayer(finished, "b", random)).toEqual(finished);
  });
});

describe("views", () => {
  it("shows everyone, watchers included, the same full state (section 4)", () => {
    const state = play([3, 4, 3]);
    expect(fourInARow.viewFor(state, "a")).toEqual(state);
    expect(fourInARow.viewFor(state, "b")).toEqual(state);
    expect(fourInARow.viewFor(state, null)).toEqual(state);
  });
});

describe("platform test kit (G4)", () => {
  it("finishes seeded random games", () => {
    for (let seed = 1; seed <= 20; seed++) {
      runGameTestKit(
        fourInARow,
        {
          optionSets: [{}],
          playerCounts: [2],
          randomMove: (state, _player, rnd) => {
            const open = Array.from({ length: COLUMNS }, (_, c) => c).filter((c) => !isFull(state.drops, c));
            return drop(open[Math.floor(rnd() * open.length)] ?? 0);
          },
          secrets: () => [],
          maxMoves: 42,
        },
        seed,
      );
    }
  });
});
