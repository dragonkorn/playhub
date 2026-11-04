import { runGameTestKit, seededRandom } from "@playhub/game-contract/testing";
import { describe, expect, it } from "vitest";
import { salabRang } from "./index";
import { ROUNDS, START_COINS } from "./meta";
import { randomMove, secrets } from "./test-adapter";
import { ROLES, type Move, type Options, type Power, type Role, type State } from "./types";

const random = seededRandom(3);
const STARTER: Options = { goal: 15, set: "starter", roles: [] };

/** A game in its first turn with chosen cards, so a test reads like a table. */
function playing(cards: Record<string, Role>, patch: Partial<State> = {}): State {
  const players = Object.keys(cards);
  const base = salabRang.setup({ players, options: STARTER, random });
  const deck = ROLES.filter((r) => Object.values(cards).includes(r));
  return { ...base, cards, deck, hidden: [...players], phase: "turn", current: players[0]!, ...patch };
}

const FOUR = { a: "vendor", b: "seer", c: "pickpocket", d: "police" } as const satisfies Record<string, Role>;

function apply(state: State, player: string, move: Move): State {
  const result = salabRang.applyMove(state, player, move, random);
  if (!result.ok) throw new Error(result.code);
  return result.state;
}

function applyAll(state: State, steps: [string, Move][]): State {
  return steps.reduce((s, [player, move]) => apply(s, player, move), state);
}

const rejection = (state: State, player: string, move: Move) => {
  const result = salabRang.applyMove(state, player, move, random);
  return result.ok ? null : result.code;
};

const claim = (role: Role): Move => ({ type: "claim", role });
const pass: Move = { type: "respond", challenge: false };
const challenge: Move = { type: "respond", challenge: true };
const power = (p: Power): Move => ({ type: "power", power: p });

/** a claims, everyone else passes, then a uses the power. */
const unchallenged = (state: State, role: Role, p: Power) =>
  applyAll(state, [
    ["a", claim(role)],
    ...state.players.filter((x) => x !== "a").map((x): [string, Move] => [x, pass]),
    ["a", power(p)],
  ]);

const coinsOf = (state: State) => state.players.map((p) => state.coins[p]);

describe("setup", () => {
  it("parses options, defaulting to the starter set and goal 15 (W1)", () => {
    expect(salabRang.defaultOptions).toEqual(STARTER);
    expect(salabRang.parseOptions({ goal: 20, set: "chaos", roles: [] })).toEqual({ goal: 20, set: "chaos", roles: [] });
    expect(salabRang.parseOptions({ goal: 15, set: "custom", roles: ["seer", "dog", "seer"] })).toEqual({
      goal: 15,
      set: "custom",
      roles: ["seer", "dog"],
    });
    expect(salabRang.parseOptions({ goal: 13, set: "starter", roles: [] })).toBeNull();
    expect(salabRang.parseOptions({ goal: 15, set: "other", roles: [] })).toBeNull();
    expect(salabRang.parseOptions({ goal: 15, set: "custom", roles: ["wizard"] })).toBeNull();
    expect(salabRang.parseOptions(null)).toBeNull();
  });

  it("deals N unique cards, police with the pickpocket, and 5 coins each, for every set (W2, W7)", () => {
    const sets: Options[] = [STARTER, { ...STARTER, set: "chaos" }, { ...STARTER, set: "random" }];
    for (const options of sets) {
      for (let n = 4; n <= 10; n++) {
        for (let seed = 0; seed < 20; seed++) {
          const players = Array.from({ length: n }, (_, i) => `p${i}`);
          const state = salabRang.setup({ players, options, random: seededRandom(seed) });
          const dealt = Object.values(state.cards);
          expect(dealt).toHaveLength(n);
          expect(new Set(dealt).size).toBe(n);
          expect([...state.deck].sort()).toEqual([...dealt].sort());
          if (dealt.includes("pickpocket")) expect(dealt).toContain("police");
          expect(Object.values(state.coins)).toEqual(players.map(() => START_COINS));
          expect([state.phase, state.round, state.current]).toEqual(["memorize", 1, "p0"]);
        }
      }
    }
  });

  it("takes the first N starter cards (W3)", () => {
    const deck = (n: number) => salabRang.setup({ players: Array.from({ length: n }, (_, i) => `p${i}`), options: STARTER, random }).deck;
    expect(deck(4)).toEqual(["vendor", "pickpocket", "police", "seer"]);
    expect(deck(10)).toHaveLength(10);
    expect(deck(10)).toContain("taxi");
  });

  it("builds the chaos set around its core (W4)", () => {
    const deck = (n: number) =>
      salabRang.setup({ players: Array.from({ length: n }, (_, i) => `p${i}`), options: { ...STARTER, set: "chaos" }, random }).deck;
    expect([...deck(4)].sort()).toEqual(["gossip", "magician", "medium", "taxi"]);
    expect([...deck(6)].sort()).toEqual(["gossip", "magician", "medium", "police", "taxi", "thug"]);
  });

  it("uses a custom deck as chosen, and refuses a start that breaks W2 (W6, L11)", () => {
    const roles: Role[] = ["seer", "dog", "monk", "vendor"];
    const options: Options = { goal: 15, set: "custom", roles };
    expect(salabRang.startError!(options, 4)).toBeNull();
    expect(salabRang.startError!(options, 5)).toBe("deck_size");
    expect(salabRang.startError!({ ...options, roles: ["pickpocket", "dog", "monk", "vendor"] }, 4)).toBe("deck_police");
    expect(salabRang.startError!(STARTER, 7)).toBeNull();
    const state = salabRang.setup({ players: ["a", "b", "c", "d"], options, random });
    expect([...state.deck].sort()).toEqual([...roles].sort());
  });
});

describe("memorize", () => {
  const fresh = () => ({ ...salabRang.setup({ players: ["a", "b", "c", "d"], options: STARTER, random }), cards: { ...FOUR } });

  it("shows every card until the viewer hides, then none (W9)", () => {
    const state = fresh();
    expect(salabRang.viewFor(state, "a").cards).toEqual(FOUR);
    const hidden = apply(state, "a", { type: "hide" });
    expect(salabRang.viewFor(hidden, "a").cards).toEqual({});
    expect(salabRang.viewFor(hidden, "b").cards).toEqual(FOUR);
    expect(salabRang.viewFor(hidden, null).cards).toEqual({});
  });

  it("waits for everyone who hasn't hidden, then starts the first turn (W10)", () => {
    let state = apply(fresh(), "b", { type: "hide" });
    expect(salabRang.activePlayers(state)).toEqual(["a", "c", "d"]);
    expect(rejection(state, "b", { type: "hide" })).toBe("wrong_phase");
    state = applyAll(state, [["a", { type: "hide" }], ["c", { type: "hide" }], ["d", { type: "hide" }]]);
    expect([state.phase, state.current]).toEqual(["turn", "a"]);
    expect(salabRang.activePlayers(state)).toEqual(["a"]);
  });
});

describe("swap and peek", () => {
  it("trades cards only when real, and nobody can tell which (W11)", () => {
    const real = apply(playing(FOUR), "a", { type: "swap", target: "c", real: true });
    const fake = apply(playing(FOUR), "a", { type: "swap", target: "c", real: false });
    expect([real.cards.a, real.cards.c]).toEqual(["pickpocket", "vendor"]);
    expect([fake.cards.a, fake.cards.c]).toEqual(["vendor", "pickpocket"]);
    for (const viewer of ["a", "b", "c", "d", null]) {
      expect(salabRang.viewFor(real, viewer)).toEqual(salabRang.viewFor(fake, viewer));
    }
    expect(real.log).toEqual([{ kind: "swap", player: "a", target: "c" }]);
    expect([real.phase, real.current]).toEqual(["turn", "b"]);
  });

  it("rejects a swap with yourself, a stranger or a blessed player (W11)", () => {
    const state = playing(FOUR, { blessings: { b: ["d"] } });
    expect(rejection(state, "a", { type: "swap", target: "a", real: true })).toBe("bad_target");
    expect(rejection(state, "a", { type: "swap", target: "z", real: true })).toBe("bad_target");
    expect(rejection(state, "a", { type: "swap", target: "b", real: true })).toBe("blessed");
  });

  it("shows only the peeker's own card until done (W12)", () => {
    const state = apply(playing(FOUR), "a", { type: "peek" });
    expect(state.phase).toBe("peek");
    expect(salabRang.viewFor(state, "a").cards).toEqual({ a: "vendor" });
    expect(salabRang.viewFor(state, "b").cards).toEqual({});
    const done = apply(state, "a", { type: "done" });
    expect([done.phase, done.current]).toEqual(["turn", "b"]);
    expect(salabRang.viewFor(done, "a").cards).toEqual({});
  });
});

describe("claims and challenges", () => {
  it("rejects claims of the dog or a role outside the deck (W13)", () => {
    const state = playing({ ...FOUR, d: "dog" });
    expect(rejection(state, "a", claim("dog"))).toBe("bad_role");
    expect(rejection(state, "a", claim("monk"))).toBe("bad_role");
    expect(rejection(state, "a", claim("police"))).toBe("bad_role");
  });

  it("lets everyone else answer and change their answer until the last one (W14, W15)", () => {
    let state = apply(playing(FOUR), "a", claim("seer"));
    expect(state.phase).toBe("challenge");
    expect(salabRang.activePlayers(state)).toEqual(["b", "c", "d"]);
    expect(rejection(state, "a", pass)).toBe("wrong_phase");
    state = applyAll(state, [["b", challenge], ["b", pass], ["c", challenge]]);
    expect(state.answers).toEqual({ b: false, c: true });
    const viewB = salabRang.viewFor(state, "b");
    expect([viewB.answered, viewB.myAnswer]).toEqual([["b", "c"], false]);
    expect(salabRang.viewFor(state, "d").myAnswer).toBeNull();
    expect(JSON.stringify(salabRang.viewFor(state, "d"))).not.toContain('"c":true');
  });

  it("uses the power at once when nobody challenges, whatever the card (W16)", () => {
    const state = applyAll(playing(FOUR), [["a", claim("seer")], ["b", pass], ["c", pass], ["d", pass]]);
    expect([state.phase, state.actor]).toEqual(["power", "a"]);
    expect(state.log).toEqual([{ kind: "claim", player: "a", role: "seer", challengers: [] }]);
  });

  it("reveals claimants, fines the wrong ones, pays a revealed dog, and lets the owner act (W16, W17)", () => {
    let state = playing({ ...FOUR, d: "dog" });
    state = applyAll(state, [["a", claim("seer")], ["b", challenge], ["c", pass], ["d", challenge]]);
    expect([state.phase, state.actor]).toEqual(["reveal", "b"]);
    expect(coinsOf(state)).toEqual([4, 5, 5, 6]);
    for (const viewer of ["a", "c", null]) {
      expect(salabRang.viewFor(state, viewer).cards).toEqual({ a: "vendor", b: "seer", d: "dog" });
    }
    expect(state.log.at(-2)).toEqual({
      kind: "reveal",
      cards: [
        { player: "a", role: "vendor", owner: false },
        { player: "b", role: "seer", owner: true },
        { player: "d", role: "dog", owner: false },
      ],
    });
    state = apply(state, "b", { type: "continue" });
    expect([state.phase, state.actor]).toEqual(["power", "b"]);
    expect(salabRang.viewFor(state, "c").cards).toEqual({});
  });

  it("ends the turn after a reveal with no true owner (W17)", () => {
    let noOwner = applyAll(playing(FOUR), [["a", claim("seer")], ["b", pass], ["c", challenge], ["d", pass]]);
    expect([noOwner.phase, noOwner.actor, coinsOf(noOwner)]).toEqual(["reveal", "a", [4, 5, 4, 5]]);
    expect(rejection(noOwner, "c", { type: "continue" })).toBe("wrong_phase");
    noOwner = apply(noOwner, "a", { type: "continue" });
    expect([noOwner.phase, noOwner.current]).toEqual(["turn", "b"]);

    let owner = applyAll(playing(FOUR), [["a", claim("vendor")], ["b", pass], ["c", challenge], ["d", pass]]);
    expect([owner.actor, coinsOf(owner)]).toEqual(["a", [5, 5, 4, 5]]);
    owner = apply(owner, "a", { type: "continue" });
    expect([owner.phase, owner.actor]).toEqual(["power", "a"]);
  });

  it("never fines below 0 (W24)", () => {
    const state = applyAll(playing(FOUR, { coins: { a: 0, b: 5, c: 5, d: 5 } }), [
      ["a", claim("seer")],
      ["b", challenge],
      ["c", pass],
      ["d", pass],
    ]);
    expect(state.coins.a).toBe(0);
  });
});

describe("powers", () => {
  it("vendor gains 2 and the customer 1 (W18)", () => {
    const state = unchallenged(playing(FOUR), "vendor", { role: "vendor", customer: "c" });
    expect(coinsOf(state)).toEqual([7, 5, 6, 5]);
    expect([state.phase, state.current]).toEqual(["turn", "b"]);
  });

  it("rejects a power that doesn't match the claim, or a bad target (W18)", () => {
    const state = applyAll(playing(FOUR), [["a", claim("vendor")], ["b", pass], ["c", pass], ["d", pass]]);
    expect(rejection(state, "a", power({ role: "seer", targets: ["b", "c"] }))).toBe("bad_role");
    expect(rejection(state, "a", power({ role: "vendor", customer: "a" }))).toBe("bad_target");
    expect(rejection(state, "b", power({ role: "vendor", customer: "c" }))).toBe("wrong_phase");
  });

  it("pickpocket takes 2, or pays the true police 3 (W18, W24)", () => {
    const took = unchallenged(playing(FOUR), "pickpocket", { role: "pickpocket", target: "b" });
    expect(coinsOf(took)).toEqual([7, 3, 5, 5]);
    expect(took.log.at(-2)).toMatchObject({ kind: "power", caught: false });
    const caught = unchallenged(playing(FOUR), "pickpocket", { role: "pickpocket", target: "d" });
    expect(coinsOf(caught)).toEqual([2, 5, 5, 8]);
    expect(caught.log.at(-2)).toMatchObject({ kind: "power", caught: true });
    const poor = unchallenged(playing(FOUR, { coins: { a: 5, b: 1, c: 5, d: 5 } }), "pickpocket", { role: "pickpocket", target: "b" });
    expect(coinsOf(poor)).toEqual([6, 0, 5, 5]);
  });

  it("police looks privately, and seizes 4 from the pickpocket in public (W21)", () => {
    let state = unchallenged(playing(FOUR), "police", { role: "police", target: "c" });
    expect([state.phase, state.actor]).toEqual(["secret", "a"]);
    expect(salabRang.viewFor(state, "a").cards).toEqual({ c: "pickpocket" });
    expect(salabRang.viewFor(state, "c").cards).toEqual({});
    expect(coinsOf(state)).toEqual([9, 5, 1, 5]);
    expect(state.log.at(-2)).toMatchObject({ kind: "power", found: true, targets: ["c"] });
    state = apply(state, "a", { type: "done" });
    expect(state.current).toBe("b");

    const missed = unchallenged(playing(FOUR), "police", { role: "police", target: "b" });
    expect(coinsOf(missed)).toEqual([5, 5, 5, 5]);
    expect(missed.log.at(-1)).toMatchObject({ kind: "power", found: false });
  });

  it("seer looks at 2 other cards and gains 1 (W21)", () => {
    const state = unchallenged(playing(FOUR), "seer", { role: "seer", targets: ["b", "d"] });
    expect(salabRang.viewFor(state, "a").cards).toEqual({ b: "seer", d: "police" });
    expect(coinsOf(state)).toEqual([6, 5, 5, 5]);
    expect(rejection(applyAll(playing(FOUR), [["a", claim("seer")], ["b", pass], ["c", pass], ["d", pass]]), "a", power({ role: "seer", targets: ["b", "b"] }))).toBe("bad_target");
  });

  it("monk blesses until the monk's next turn starts (W25)", () => {
    let state = unchallenged(playing({ ...FOUR, a: "monk" }), "monk", { role: "monk", target: "c" });
    expect(state.blessings).toEqual({ c: ["a"] });
    expect(salabRang.viewFor(state, "d").blessed).toEqual(["c"]);
    expect(rejection(state, "b", { type: "swap", target: "c", real: true })).toBe("blessed");
    state = applyAll(state, [["b", { type: "peek" }], ["b", { type: "done" }], ["c", { type: "peek" }], ["c", { type: "done" }], ["d", { type: "peek" }], ["d", { type: "done" }]]);
    expect(state.current).toBe("a");
    expect(state.blessings).toEqual({});
  });

  it("magician moves every card one step, skipping blessed players (W19)", () => {
    const cards = { a: "magician", b: "seer", c: "pickpocket", d: "police" } as const;
    let state = unchallenged(playing(cards), "magician", { role: "magician" });
    expect(state.cards).toEqual({ a: "police", b: "magician", c: "seer", d: "pickpocket" });
    expect(state.coins.a).toBe(6);
    state = unchallenged(playing(cards, { blessings: { c: ["b"] } }), "magician", { role: "magician" });
    expect(state.cards).toEqual({ a: "police", b: "magician", c: "pickpocket", d: "seer" });
  });

  it("collector takes 1 from everyone richer (W18)", () => {
    const state = unchallenged(playing({ ...FOUR, a: "collector" }, { coins: { a: 5, b: 7, c: 5, d: 9 } }), "collector", { role: "collector" });
    expect(coinsOf(state)).toEqual([7, 6, 5, 8]);
  });

  it("medium pays 1 and uses another role's power (W20)", () => {
    const cards = { a: "medium", b: "seer", c: "pickpocket", d: "police" } as const;
    const state = unchallenged(playing(cards), "medium", { role: "medium", as: { role: "pickpocket", target: "b" } });
    expect(coinsOf(state)).toEqual([6, 3, 5, 5]);
    expect(state.log.at(-2)).toMatchObject({ kind: "power", role: "medium", as: "pickpocket" });
    const base = applyAll(playing(cards), [["a", claim("medium")], ["b", pass], ["c", pass], ["d", pass]]);
    expect(rejection(base, "a", power({ role: "medium", as: { role: "medium", as: { role: "magician" } } }))).toBe("bad_role");
    expect(rejection(base, "a", power({ role: "medium", as: { role: "vendor", customer: "b" } }))).toBe("bad_role");
    const broke = unchallenged(playing(cards, { coins: { a: 0, b: 5, c: 5, d: 5 } }), "medium", { role: "medium", as: { role: "pickpocket", target: "b" } });
    expect(coinsOf(broke)).toEqual([0, 5, 5, 5]);
    expect(broke.log.at(-1)).toMatchObject({ kind: "power", skipped: true });
  });

  it("gossip shows the target's card to everyone until the target turns it over (W22)", () => {
    const cards = { a: "gossip", b: "seer", c: "pickpocket", d: "police" } as const;
    let state = unchallenged(playing(cards), "gossip", { role: "gossip", target: "c" });
    expect([state.phase, state.actor, state.coins.a]).toEqual(["shown", "c", 6]);
    for (const viewer of ["a", "b", "c", "d"]) expect(salabRang.viewFor(state, viewer).cards).toEqual({ c: "pickpocket" });
    expect(rejection(state, "a", { type: "continue" })).toBe("wrong_phase");
    state = apply(state, "c", { type: "continue" });
    expect([state.phase, state.current]).toEqual(["turn", "b"]);
  });

  it("thug takes 1 and mutes the target for their next turn only (W25)", () => {
    const cards = { a: "thug", b: "seer", c: "pickpocket", d: "police" } as const;
    let state = unchallenged(playing(cards), "thug", { role: "thug", target: "b" });
    expect(coinsOf(state)).toEqual([6, 4, 5, 5]);
    expect(salabRang.viewFor(state, "c").muted).toEqual(["b"]);
    expect(rejection(state, "b", claim("seer"))).toBe("muted");
    state = applyAll(state, [["b", { type: "peek" }], ["b", { type: "done" }]]);
    expect(salabRang.viewFor(state, "c").muted).toEqual([]);
  });

  it("masseur takes 1 and lets the target see their own card (W23)", () => {
    const cards = { a: "masseur", b: "seer", c: "pickpocket", d: "police" } as const;
    let state = unchallenged(playing(cards), "masseur", { role: "masseur", target: "d" });
    expect([state.phase, state.actor]).toEqual(["massage", "d"]);
    expect(coinsOf(state)).toEqual([6, 5, 5, 4]);
    expect(salabRang.viewFor(state, "d").cards).toEqual({ d: "police" });
    expect(salabRang.viewFor(state, "a").cards).toEqual({});
    state = apply(state, "d", { type: "done" });
    expect(state.current).toBe("b");
  });

  it("taxi moves 2 between two others and gains 1 (W18)", () => {
    const cards = { a: "taxi", b: "seer", c: "pickpocket", d: "police" } as const;
    const state = unchallenged(playing(cards), "taxi", { role: "taxi", from: "b", to: "d" });
    expect(coinsOf(state)).toEqual([6, 3, 5, 7]);
    const base = applyAll(playing(cards), [["a", claim("taxi")], ["b", pass], ["c", pass], ["d", pass]]);
    expect(rejection(base, "a", power({ role: "taxi", from: "a", to: "d" }))).toBe("bad_target");
    expect(rejection(base, "a", power({ role: "taxi", from: "b", to: "b" }))).toBe("bad_target");
  });

  it("lets the actor skip a power (W18)", () => {
    const base = applyAll(playing(FOUR), [["a", claim("vendor")], ["b", pass], ["c", pass], ["d", pass]]);
    const state = apply(base, "a", { type: "done" });
    expect([state.phase, state.current, state.coins.a]).toEqual(["turn", "b", 5]);
  });
});

describe("end", () => {
  it("ends after a turn that reaches the goal, ranking by coins (W26)", () => {
    const state = unchallenged(playing(FOUR, { coins: { a: 13, b: 5, c: 5, d: 13 } }), "vendor", { role: "vendor", customer: "d" });
    expect([state.phase, state.reason]).toEqual(["finished", "goal"]);
    expect(salabRang.outcome(state)).toEqual({ done: true, ranking: [["a"], ["d"], ["b", "c"]] });
  });

  it("ends after round 4 (W8, W26)", () => {
    let state = playing(FOUR, { round: ROUNDS, current: "d" });
    state = apply(state, "d", { type: "peek" });
    state = apply(state, "d", { type: "done" });
    expect([state.phase, state.reason]).toEqual(["finished", "rounds"]);
    const earlier = applyAll(playing(FOUR, { round: 1, current: "d" }), [["d", { type: "peek" }], ["d", { type: "done" }]]);
    expect([earlier.phase, earlier.round, earlier.current]).toEqual(["turn", 2, "a"]);
  });

  it("shows every card and rejects every move after the end (W27)", () => {
    const state = playing(FOUR, { phase: "finished", reason: "rounds" });
    expect(salabRang.viewFor(state, "b").cards).toEqual(FOUR);
    expect(rejection(state, "a", { type: "peek" })).toBe("wrong_phase");
  });
});

describe("lost players", () => {
  const five = { a: "vendor", b: "seer", c: "pickpocket", d: "police", e: "monk" } as const;

  it("ranks removed players last and drops their card (W26, W28)", () => {
    let state = salabRang.removePlayer(playing(five), "c", random);
    expect(state.cards.c).toBeUndefined();
    expect(state.players).toEqual(["a", "b", "d", "e"]);
    state = { ...state, phase: "finished", reason: "rounds" };
    expect(salabRang.outcome(state)).toEqual({ done: true, ranking: [["a", "b", "d", "e"], ["c"]] });
  });

  it("moves on when the current player or actor leaves (W29)", () => {
    expect(salabRang.removePlayer(playing(five), "a", random).current).toBe("b");
    const peeking = apply(playing(five), "a", { type: "peek" });
    expect(salabRang.removePlayer(peeking, "a", random)).toMatchObject({ phase: "turn", current: "b" });
    const shown = unchallenged(playing({ ...five, a: "gossip" }), "gossip", { role: "gossip", target: "c" });
    expect(salabRang.removePlayer(shown, "c", random)).toMatchObject({ phase: "turn", current: "b" });
  });

  it("stops waiting for a removed player's answer (W29)", () => {
    let state = applyAll(playing(five), [["a", claim("vendor")], ["b", pass], ["c", pass], ["d", pass]]);
    state = salabRang.removePlayer(state, "e", random);
    expect([state.phase, state.actor]).toEqual(["power", "a"]);
    const claimerGone = salabRang.removePlayer(apply(playing(five), "a", claim("seer")), "a", random);
    expect([claimerGone.phase, claimerGone.current]).toEqual(["turn", "b"]);
  });

  it("finishes the memorize phase without a removed player, and ends below 2 players (W10, W30)", () => {
    let state = salabRang.setup({ players: ["a", "b", "c", "d"], options: STARTER, random });
    state = applyAll(state, [["a", { type: "hide" }], ["b", { type: "hide" }], ["c", { type: "hide" }]]);
    expect(salabRang.removePlayer(state, "d", random).phase).toBe("turn");
    let few = playing(FOUR);
    for (const p of ["b", "c", "d"]) few = salabRang.removePlayer(few, p, random);
    expect([few.phase, few.reason]).toEqual(["finished", "players"]);
  });
});

describe("test kit", () => {
  it("finishes, survives JSON and never leaks, with every set (G4)", () => {
    runGameTestKit(salabRang, {
      optionSets: [
        STARTER,
        { goal: 12, set: "chaos", roles: [] },
        { goal: 20, set: "random", roles: [] },
        { goal: 15, set: "custom", roles: ["medium", "gossip", "thug", "masseur", "taxi", "dog"] },
      ],
      playerCounts: [4, 6, 10],
      randomMove,
      secrets,
      maxMoves: 5000,
    });
  });
});
