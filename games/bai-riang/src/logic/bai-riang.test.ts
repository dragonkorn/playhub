import { runGameTestKit, seededRandom } from "@playhub/game-contract/testing";
import { describe, expect, it } from "vitest";
import { baiRiang, lowestOf } from "./index";
import { LIVES, TOPIC_COUNT } from "./meta";
import type { Move, Options, State } from "./types";

const random = seededRandom(7);
const RANDOM: Options = { topics: "random" };
const AGREED: Options = { topics: "agreed" };

const start = (players = ["a", "b", "c"], options = RANDOM) => baiRiang.setup({ players, options, random });

/** A level with chosen numbers, so a test reads like a table. */
const dealt = (hands: Record<string, number[]>, state = start(Object.keys(hands))): State => ({ ...state, dealt: hands });

function apply(state: State, player: string, move: Move): State {
  const result = baiRiang.applyMove(state, player, move, random);
  if (!result.ok) throw new Error(result.code);
  return result.state;
}

const rejection = (state: State, player: string, move: Move) => {
  const result = baiRiang.applyMove(state, player, move, random);
  return result.ok ? null : result.code;
};

const play = (card: number): Move => ({ type: "play", card });

describe("setup", () => {
  it("parses the topics option, defaulting to random (N1)", () => {
    expect(baiRiang.defaultOptions).toEqual(RANDOM);
    expect(baiRiang.parseOptions({ topics: "agreed" })).toEqual(AGREED);
    expect(baiRiang.parseOptions({ topics: "other" })).toBeNull();
    expect(baiRiang.parseOptions(null)).toBeNull();
  });

  it("starts level 1 with 3 lives, dealing 1 unique number from 1 to 100 per player (N2, N3)", () => {
    const state = start(["a", "b", "c", "d"]);
    expect([state.phase, state.level, state.lives]).toEqual(["playing", 1, LIVES]);
    const numbers = Object.values(state.dealt).flat();
    expect(numbers).toHaveLength(4);
    expect(new Set(numbers).size).toBe(4);
    for (const n of numbers) expect(n >= 1 && n <= 100 && Number.isInteger(n)).toBe(true);
  });

  it("draws a topic only with random topics (N1, N4)", () => {
    const state = start();
    expect(state.topic).not.toBeNull();
    expect(state.topic! >= 0 && state.topic! < TOPIC_COUNT).toBe(true);
    expect(state.used).toEqual([state.topic]);
    expect(start(["a", "b"], AGREED).topic).toBeNull();
  });

  it("makes everyone holding a number active (N5)", () => {
    expect(baiRiang.activePlayers(dealt({ a: [10], b: [20], c: [30] }))).toEqual(["a", "b", "c"]);
  });

  it("parses only well-formed moves", () => {
    expect(baiRiang.parseMove({ type: "play", card: 12 })).toEqual(play(12));
    expect(baiRiang.parseMove({ type: "next", level: 2 })).toEqual({ type: "next", level: 2 });
    expect(baiRiang.parseMove({ type: "reroll", level: 1 })).toEqual({ type: "reroll", level: 1 });
    expect(baiRiang.parseMove({ type: "play", card: "12" })).toBeNull();
    expect(baiRiang.parseMove({ type: "jump" })).toBeNull();
    expect(baiRiang.parseMove(7)).toBeNull();
  });
});

describe("play", () => {
  it("reveals the player's lowest number, and rejects any other (N6)", () => {
    const state = dealt({ a: [10, 70], b: [20, 30] });
    expect(rejection(state, "a", play(70))).toBe("not_your_card");
    expect(rejection(state, "a", play(55))).toBe("not_your_card");
    const next = apply(state, "a", play(10));
    expect(next.reveals).toEqual([{ player: "a", card: 10, skipped: [] }]);
    expect(rejection(next, "a", play(10))).toBe("not_your_card");
    expect(next.lives).toBe(LIVES);
  });

  it("skips every lower unrevealed number, 1 life each (N7)", () => {
    const state = apply(dealt({ a: [10, 50], b: [20], c: [30] }), "c", play(30));
    expect(state.reveals).toEqual([
      {
        player: "c",
        card: 30,
        skipped: [
          { player: "a", card: 10 },
          { player: "b", card: 20 },
        ],
      },
    ]);
    expect(state.lives).toBe(LIVES - 2);
    expect(lowestOf(state, "a")).toBe(50);
    expect(baiRiang.activePlayers(state)).toEqual(["a"]);
  });

  it("loses the game when lives run out (N8)", () => {
    const state = apply({ ...dealt({ a: [10], b: [20], c: [90] }), lives: 2 }, "c", play(90));
    expect([state.phase, state.lives, state.won]).toEqual(["finished", 0, false]);
    expect(baiRiang.outcome(state)).toEqual({ done: true, ranking: [["a", "b", "c"]], team: "lost" });
  });

  it("clears the level once every number is out, even after a mistake (N9)", () => {
    let state = apply(dealt({ a: [10], b: [20], c: [30] }), "b", play(20));
    state = apply(state, "c", play(30));
    expect([state.phase, state.lives]).toEqual(["cleared", LIVES - 1]);
    expect(baiRiang.activePlayers(state)).toEqual(["a", "b", "c"]);
    expect(baiRiang.outcome(state)).toEqual({ done: false });
  });
});

describe("levels", () => {
  const cleared = () => ["a", "b", "c"].reduce((s, p, i) => apply(s, p, play((i + 1) * 10)), dealt({ a: [10], b: [20], c: [30] }));

  it("starts the next level with level-many numbers and a new topic, once (N10, N4)", () => {
    const before = cleared();
    expect(rejection(before, "a", { type: "next", level: 3 })).toBe("wrong_phase");
    const next = apply(before, "b", { type: "next", level: 2 });
    expect([next.phase, next.level, next.reveals]).toEqual(["playing", 2, []]);
    for (const hand of Object.values(next.dealt)) {
      expect(hand).toHaveLength(2);
      expect([...hand].sort((x, y) => x - y)).toEqual(hand);
    }
    expect(new Set(Object.values(next.dealt).flat()).size).toBe(6);
    expect(next.topic).not.toBe(before.topic);
    expect(next.used).toEqual([before.topic, next.topic]);
    expect(rejection(next, "a", { type: "next", level: 2 })).toBe("wrong_phase");
  });

  it("rejects a play while the level is cleared (N10)", () => {
    expect(rejection(cleared(), "a", play(10))).toBe("wrong_phase");
  });

  it("wins after clearing level 3 (N9)", () => {
    const last = dealt({ a: [5, 6, 7], b: [50, 60, 70] }, { ...start(["a", "b"]), level: 3 });
    const state = [5, 6, 7].reduce((s, n) => apply(s, "a", play(n)), last);
    const won = [50, 60, 70].reduce((s, n) => apply(s, "b", play(n)), state);
    expect([won.phase, won.won]).toEqual(["finished", true]);
    expect(baiRiang.outcome(won)).toEqual({ done: true, ranking: [["a", "b"]], team: "won" });
    expect(rejection(won, "a", { type: "next", level: 4 })).toBe("wrong_phase");
  });

  it("keeps agreed topics empty on every level (N1)", () => {
    const state = dealt({ a: [10], b: [20] }, start(["a", "b"], AGREED));
    const next = apply(apply(apply(state, "a", play(10)), "b", play(20)), "a", { type: "next", level: 2 });
    expect(next.topic).toBeNull();
  });
});

describe("reroll", () => {
  it("draws an unused topic before the first reveal only (N11, N4)", () => {
    const state = dealt({ a: [10], b: [20] }, start(["a", "b"]));
    const rerolled = apply(state, "b", { type: "reroll", level: 1 });
    expect(rerolled.topic).not.toBe(state.topic);
    expect(rerolled.used).toEqual([state.topic, rerolled.topic]);
    expect(rejection(rerolled, "a", { type: "reroll", level: 2 })).toBe("wrong_phase");
    expect(rejection(apply(rerolled, "a", play(10)), "b", { type: "reroll", level: 1 })).toBe("wrong_phase");
  });

  it("is refused with agreed topics, and when no topic is left (N11)", () => {
    expect(rejection(start(["a", "b"], AGREED), "a", { type: "reroll", level: 1 })).toBe("wrong_phase");
    const all = Array.from({ length: TOPIC_COUNT }, (_, i) => i);
    expect(rejection({ ...start(["a", "b"]), used: all }, "a", { type: "reroll", level: 1 })).toBe("no_topics");
  });

  it("never repeats a topic within a game (N4)", () => {
    let state = start(["a", "b"]);
    for (let i = 0; i < TOPIC_COUNT - 1; i++) state = apply(state, "a", { type: "reroll", level: 1 });
    expect(new Set(state.used).size).toBe(TOPIC_COUNT);
  });
});

describe("removal", () => {
  it("discards the player's numbers without losing a life (N13)", () => {
    const state = baiRiang.removePlayer(dealt({ a: [10], b: [20], c: [30] }), "a", random);
    expect(state.players).toEqual(["b", "c"]);
    expect(state.lives).toBe(LIVES);
    expect(apply(state, "b", play(20)).lives).toBe(LIVES);
  });

  it("clears the level when the removed player held the last numbers (N13)", () => {
    const state = baiRiang.removePlayer(apply(dealt({ a: [10], b: [20] }), "a", play(10)), "b", random);
    expect(state.phase).toBe("cleared");
  });

  it("loses when no player remains, and changes nothing after the end (N14)", () => {
    const state = baiRiang.removePlayer(baiRiang.removePlayer(dealt({ a: [10], b: [20] }), "a", random), "b", random);
    expect([state.phase, state.won]).toEqual(["finished", false]);
    expect(baiRiang.removePlayer(state, "a", random)).toEqual(state);
  });
});

describe("views (section 4)", () => {
  it("holds only the viewer's own numbers, counts and public reveals", () => {
    const state = apply(dealt({ a: [10, 80], b: [20, 90], c: [30, 95] }), "b", play(20));
    const view = baiRiang.viewFor(state, "a");
    expect(view.mine).toEqual([10, 80]);
    expect(view.left).toEqual({ a: 1, b: 1, c: 2 });
    expect(view.reveals).toEqual([{ player: "b", card: 20, skipped: [{ player: "a", card: 10 }] }]);
    expect(JSON.stringify(view)).not.toMatch(/\b(90|30|95)\b/);
    expect(baiRiang.viewFor(state, null).mine).toEqual([]);
  });
});

describe("platform test kit (G4)", () => {
  it("finishes seeded random games without leaking hands", () => {
    for (let seed = 1; seed <= 10; seed++) {
      runGameTestKit(
        baiRiang,
        {
          optionSets: [RANDOM, AGREED],
          playerCounts: [2, 5, 10],
          randomMove: (state, player, rnd) => {
            if (state.phase === "cleared") return { type: "next", level: state.level + 1 };
            if (state.reveals.length === 0 && state.options.topics === "random" && rnd() < 0.1) return { type: "reroll", level: state.level };
            return play(lowestOf(state, player) ?? 0);
          },
          secrets: (state, viewer) =>
            state.players.filter((p) => p !== viewer).map((p) => `"${p}":${JSON.stringify(state.dealt[p])}`),
          maxMoves: 200,
        },
        seed,
      );
    }
  });
});
