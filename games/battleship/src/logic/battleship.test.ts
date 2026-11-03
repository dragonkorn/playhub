import { runGameTestKit, seededRandom } from "@playhub/game-contract/testing";
import { describe, expect, it } from "vitest";
import { FLEET, cellsOf, randomFleet } from "./fleet";
import { battleship } from "./index";
import type { Move, Options, Placement, ShipId, State, View } from "./types";

const random = seededRandom(7);

const fleetA: Placement[] = [
  { ship: "carrier", row: 0, col: 0, orientation: "horizontal" },
  { ship: "battleship", row: 1, col: 0, orientation: "horizontal" },
  { ship: "cruiser", row: 2, col: 0, orientation: "horizontal" },
  { ship: "submarine", row: 3, col: 0, orientation: "horizontal" },
  { ship: "destroyer", row: 4, col: 0, orientation: "horizontal" },
];

const start = (players: string[], targeting: Options["targeting"] = "free") =>
  battleship.setup({ players, options: { targeting }, random });

function apply(state: State, player: string, move: Move): State {
  const result = battleship.applyMove(state, player, move, random);
  if (!result.ok) throw new Error(result.code);
  return result.state;
}

const rejection = (state: State, player: string, move: Move) => {
  const result = battleship.applyMove(state, player, move, random);
  return result.ok ? null : result.code;
};

/** Everyone is ready with fleetA. Turn order is fixed to the given order. */
function battle(players: string[], targeting: Options["targeting"] = "free"): State {
  let state = start(players, targeting);
  for (const p of players) state = apply(state, p, { type: "ready", fleet: fleetA });
  return { ...state, turnOrder: players, current: players[0] ?? null };
}

/** Lets `shooter` hit every cell of the named ship on `target`, keeping the turn. */
function sink(state: State, shooter: string, target: string, ship: ShipId): State {
  const placement = fleetA.find((p) => p.ship === ship);
  if (!placement) throw new Error(ship);
  let next = state;
  for (const cell of cellsOf(placement)) {
    next = { ...next, current: shooter };
    next = apply(next, shooter, { type: "fire", target, ...cell });
  }
  return next;
}

describe("setup phase", () => {
  it("gives every player a 5-ship fleet to place (B1)", () => {
    expect(Object.values(FLEET)).toEqual([5, 4, 3, 3, 2]);
    expect(start(["a", "b"]).phase).toBe("setup");
  });

  it("has every unready player active (B3)", () => {
    const state = apply(start(["a", "b", "c"]), "a", { type: "ready", fleet: fleetA });
    expect(battleship.activePlayers(state).sort()).toEqual(["b", "c"]);
  });

  it.each<[string, Placement[]]>([
    ["missing ship", fleetA.slice(1)],
    ["duplicate ship", [...fleetA.slice(1), fleetA[1] as Placement]],
    ["overlap", fleetA.map((p, i) => (i === 1 ? { ...p, row: 0 } : p))],
    ["off board", fleetA.map((p, i) => (i === 0 ? { ...p, col: 7 } : p))],
    ["off board vertically", fleetA.map((p, i) => (i === 0 ? { ...p, row: 7, orientation: "vertical" } : p))],
    ["negative cell", fleetA.map((p, i) => (i === 0 ? { ...p, row: -1 } : p))],
  ])("rejects a fleet with %s (B5)", (_, fleet) => {
    expect(rejection(start(["a", "b"]), "a", { type: "ready", fleet })).toBe("invalid_fleet");
  });

  it("rejects a diagonal ship at parsing, because orientation is only horizontal or vertical (B5)", () => {
    const raw = { type: "ready", fleet: [{ ...fleetA[0], orientation: "diagonal" }] };
    expect(battleship.parseMove(raw)).toBeNull();
  });

  it("accepts touching ships (B5)", () => {
    expect(rejection(start(["a", "b"]), "a", { type: "ready", fleet: fleetA })).toBeNull();
  });

  it("makes Ready final (B6)", () => {
    const state = apply(start(["a", "b"]), "a", { type: "ready", fleet: fleetA });
    expect(rejection(state, "a", { type: "ready", fleet: fleetA })).toBe("already_ready");
  });

  it("starts battle only when everyone is ready, with a seeded shuffle (B7)", () => {
    const players = ["a", "b", "c", "d", "e", "f"];
    let state = start(players);
    for (const p of players.slice(0, 5)) {
      state = apply(state, p, { type: "ready", fleet: fleetA });
      expect(state.phase).toBe("setup");
    }
    const run = (seed: number) =>
      battleship.applyMove(state, "f", { type: "ready", fleet: fleetA }, seededRandom(seed));
    const first = run(3);
    const second = run(3);
    if (!first.ok || !second.ok) throw new Error("rejected");
    expect(first.state.phase).toBe("battle");
    expect(first.state.turnOrder).toEqual(second.state.turnOrder);
    expect([...first.state.turnOrder].sort()).toEqual(players);
    expect(first.state.turnOrder).not.toEqual(players);
    expect(first.state.current).toBe(first.state.turnOrder[0]);
  });

  it("rejects a shot during setup", () => {
    expect(rejection(start(["a", "b"]), "a", { type: "fire", target: "b", row: 0, col: 0 })).toBe("wrong_phase");
  });
});

describe("battle phase", () => {
  it("has only the current player active (B8)", () => {
    expect(battleship.activePlayers(battle(["a", "b", "c"]))).toEqual(["a"]);
  });

  it.each([
    ["hit", 0, 0],
    ["miss", 9, 9],
  ])("passes the turn on a %s (B9)", (_, row, col) => {
    const state = apply(battle(["a", "b", "c"]), "a", { type: "fire", target: "b", row, col });
    expect(state.current).toBe("b");
  });

  it("rejects a shot from anyone but the current player", () => {
    expect(rejection(battle(["a", "b"]), "b", { type: "fire", target: "a", row: 0, col: 0 })).toBe("not_your_turn");
  });

  it("rejects shooting yourself or a player who is out in free mode (B10)", () => {
    const state = battle(["a", "b", "c"]);
    expect(rejection(state, "a", { type: "fire", target: "a", row: 0, col: 0 })).toBe("invalid_target");
    const removed = battleship.removePlayer(state, "c", random);
    expect(rejection(removed, "a", { type: "fire", target: "c", row: 0, col: 0 })).toBe("invalid_target");
    expect(rejection(state, "a", { type: "fire", target: "nobody", row: 0, col: 0 })).toBe("invalid_target");
  });

  it("allows any opponent in free mode (B10)", () => {
    expect(rejection(battle(["a", "b", "c"]), "a", { type: "fire", target: "c", row: 0, col: 0 })).toBeNull();
  });

  it("forces the next player in round robin (B11)", () => {
    const state = battle(["a", "b", "c"], "robin");
    expect(rejection(state, "a", { type: "fire", target: "c", row: 0, col: 0 })).toBe("invalid_target");
    expect(rejection(state, "a", { type: "fire", target: "b", row: 0, col: 0 })).toBeNull();
  });

  it("moves the round robin target past an eliminated player (B11)", () => {
    let state = battle(["a", "b", "c"], "robin");
    for (const ship of Object.keys(FLEET) as ShipId[]) {
      state = sink({ ...state, current: "a" }, "a", "b", ship);
    }
    expect(state.out).toEqual(["b"]);
    expect(battleship.viewFor({ ...state, current: "a" }, "a").forcedTarget).toBe("c");
  });

  it("rejects cells off the board", () => {
    expect(rejection(battle(["a", "b"]), "a", { type: "fire", target: "b", row: 10, col: 0 })).toBe("off_board");
    expect(rejection(battle(["a", "b"]), "a", { type: "fire", target: "b", row: 0, col: -1 })).toBe("off_board");
  });

  it("rejects a repeat cell and keeps the turn (B12)", () => {
    let state = apply(battle(["a", "b"]), "a", { type: "fire", target: "b", row: 9, col: 9 });
    state = { ...state, current: "a" };
    expect(rejection(state, "a", { type: "fire", target: "b", row: 9, col: 9 })).toBe("already_shot");
    expect(state.current).toBe("a");
  });

  it("allows the same cell on a different board (B12)", () => {
    let state = apply(battle(["a", "b", "c"]), "a", { type: "fire", target: "b", row: 9, col: 9 });
    state = { ...state, current: "a" };
    expect(rejection(state, "a", { type: "fire", target: "c", row: 9, col: 9 })).toBeNull();
  });

  it("names a ship only when it sinks (B13, B14)", () => {
    const state = sink(battle(["a", "b", "c"]), "a", "b", "destroyer");
    const [first, last] = state.shots;
    expect(first).toMatchObject({ result: "hit" });
    expect(first).not.toHaveProperty("ship");
    expect(last).toMatchObject({ result: "sunk", ship: "destroyer" });
    const miss = apply({ ...state, current: "a" }, "a", { type: "fire", target: "b", row: 9, col: 9 });
    expect(miss.shots.at(-1)).toMatchObject({ result: "miss" });
  });

  it("eliminates a player whose ships are all sunk, and the last player wins (B15, B16)", () => {
    let state = battle(["a", "b", "c"]);
    for (const ship of Object.keys(FLEET) as ShipId[]) state = sink(state, "a", "b", ship);
    expect(state.out).toEqual(["b"]);
    expect(battleship.eliminatedPlayers(state)).toEqual(["b"]);
    expect(battleship.outcome(state)).toEqual({ done: false });
    for (const ship of Object.keys(FLEET) as ShipId[]) state = sink(state, "a", "c", ship);
    expect(state.phase).toBe("finished");
    expect(state.current).toBeNull();
    expect(battleship.outcome(state)).toEqual({ done: true, ranking: [["a"], ["c"], ["b"]] });
  });

  it("skips eliminated players in turn order", () => {
    let state = battle(["a", "b", "c"]);
    for (const ship of Object.keys(FLEET) as ShipId[]) state = sink(state, "a", "b", ship);
    state = { ...state, current: "a" };
    state = apply(state, "a", { type: "fire", target: "c", row: 9, col: 9 });
    expect(state.current).toBe("c");
  });
});

describe("lost players", () => {
  it("drops a setup player and starts battle if everyone left is ready (B17)", () => {
    let state = start(["a", "b", "c"]);
    state = apply(state, "a", { type: "ready", fleet: fleetA });
    state = apply(state, "b", { type: "ready", fleet: fleetA });
    state = battleship.removePlayer(state, "c", random);
    expect(state.phase).toBe("battle");
    expect(state.turnOrder).not.toContain("c");
  });

  it("passes the turn when the current player is removed (B18)", () => {
    const state = battleship.removePlayer(battle(["a", "b", "c"]), "a", random);
    expect(state.current).toBe("b");
    expect(state.out).toEqual(["a"]);
  });

  it("keeps the turn when someone else is removed (B18)", () => {
    expect(battleship.removePlayer(battle(["a", "b", "c"]), "c", random).current).toBe("a");
  });

  it("keeps a lost player's fleet hidden (B18)", () => {
    const state = battleship.removePlayer(battle(["a", "b", "c"]), "c", random);
    expect(battleship.viewFor(state, "a").sunk.c).toEqual([]);
  });

  it("ends the game when one of two is removed (B19)", () => {
    const state = battleship.removePlayer(battle(["a", "b"]), "b", random);
    expect(state.phase).toBe("finished");
    expect(battleship.outcome(state)).toEqual({ done: true, ranking: [["a"], ["b"]] });
  });

  it("ends the game when setup drops to one player (B19)", () => {
    const state = battleship.removePlayer(start(["a", "b"]), "b", random);
    expect(state.phase).toBe("finished");
  });
});

describe("views", () => {
  const during = () => {
    let state = sink(battle(["a", "b", "c"]), "a", "b", "destroyer");
    state = { ...state, current: "a" };
    return apply(state, "a", { type: "fire", target: "b", row: 0, col: 0 });
  };

  it("shows everyone all shots and sunk ships (B20)", () => {
    const state = during();
    for (const viewer of ["a", "b", "c"]) {
      const view = battleship.viewFor(state, viewer);
      expect(view.shots).toHaveLength(3);
      expect(view.sunk.b).toEqual([fleetA[4]]);
      expect(view.shipsLeft.b).toBe(4);
    }
  });

  it("never holds another player's unsunk fleet during play (B20 to B22)", () => {
    const view = battleship.viewFor(during(), "a");
    expect(view.myFleet).toEqual(fleetA);
    expect(view.allFleets).toBeNull();
    expect(JSON.stringify(view.sunk.b)).not.toContain("carrier");
  });

  it("keeps other fleets hidden from eliminated players (B21)", () => {
    let state = battle(["a", "b", "c"]);
    for (const ship of Object.keys(FLEET) as ShipId[]) state = sink(state, "a", "b", ship);
    const view = battleship.viewFor(state, "b");
    expect(view.myFleet).toEqual(fleetA);
    expect(view.allFleets).toBeNull();
    expect(view.sunk.a).toEqual([]);
  });

  it("gives a watcher with no seat no fleet (B22)", () => {
    expect(battleship.viewFor(during(), null).myFleet).toBeNull();
  });

  it("reveals all fleets after the game (section 5)", () => {
    const state = battleship.removePlayer(battle(["a", "b"]), "b", random);
    expect(battleship.viewFor(state, "a").allFleets).toEqual({ a: fleetA, b: fleetA });
  });

  it("shows who is ready without showing fleets", () => {
    const state = apply(start(["a", "b"]), "a", { type: "ready", fleet: fleetA });
    const view: View = battleship.viewFor(state, "b");
    expect(view.ready).toEqual(["a"]);
    expect(view.myFleet).toBeNull();
  });

  it("sets forcedTarget only for the player who may shoot", () => {
    const state = battle(["a", "b", "c"], "robin");
    expect(battleship.viewFor(state, "a").forcedTarget).toBe("b");
    expect(battleship.viewFor(state, "b").forcedTarget).toBeNull();
  });
});

describe("parsing", () => {
  it("accepts valid options and rejects anything else (B2)", () => {
    expect(battleship.parseOptions({ targeting: "robin" })).toEqual({ targeting: "robin" });
    expect(battleship.parseOptions({ targeting: "chaos" })).toBeNull();
    expect(battleship.parseOptions(null)).toBeNull();
  });

  it.each([
    [null],
    ["fire"],
    [{ type: "nuke" }],
    [{ type: "fire", target: 1, row: 0, col: 0 }],
    [{ type: "fire", target: "a", row: 0.5, col: 0 }],
    [{ type: "ready", fleet: "x" }],
    [{ type: "ready", fleet: [{ ship: "yacht", row: 0, col: 0, orientation: "vertical" }] }],
  ])("rejects malformed move %j", (raw) => {
    expect(battleship.parseMove(raw)).toBeNull();
  });

  it("keeps only known fields on a valid move", () => {
    const raw = { type: "fire", target: "a", row: 1, col: 2, extra: "x" };
    expect(battleship.parseMove(raw)).toEqual({ type: "fire", target: "a", row: 1, col: 2 });
  });
});

describe("meta", () => {
  it("declares 2 to 10 players on iPad landscape", () => {
    expect(battleship.meta).toEqual({
      id: "battleship",
      minPlayers: 2,
      maxPlayers: 10,
      orientations: ["landscape"],
    });
  });
});

describe("test kit (G4)", () => {
  const adapter = {
    optionSets: [{ targeting: "free" }, { targeting: "robin" }] as Options[],
    playerCounts: [2, 3, 10],
    maxMoves: 2000,
    randomMove(state: State, player: string, rand: () => number): Move {
      if (state.phase === "setup") return { type: "ready", fleet: randomFleet(rand) };
      const view = battleship.viewFor(state, player);
      const targets = state.turnOrder.filter((p) => p !== player && !state.out.includes(p));
      const target = view.forcedTarget ?? (targets[Math.floor(rand() * targets.length)] as string);
      const taken = new Set(state.shots.filter((s) => s.target === target).map((s) => `${s.row},${s.col}`));
      const free: { row: number; col: number }[] = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) if (!taken.has(`${row},${col}`)) free.push({ row, col });
      }
      return { type: "fire", target, ...(free[Math.floor(rand() * free.length)] as { row: number; col: number }) };
    },
    secrets(state: State, viewer: string): string[] {
      if (state.phase === "finished") return [];
      const view = battleship.viewFor(state, viewer);
      // Random fleets can match by chance, so a placement the viewer may see isn't a secret.
      const visible = new Set([...(view.myFleet ?? []), ...Object.values(view.sunk).flat()].map((p) => JSON.stringify(p)));
      return Object.entries(state.fleets).flatMap(([owner, fleet]) => {
        if (owner === viewer || !fleet) return [];
        const sunk = state.shots.filter((s) => s.target === owner && s.ship).map((s) => s.ship);
        return fleet
          .filter((p) => !sunk.includes(p.ship))
          .map((p) => JSON.stringify(p))
          .filter((secret) => !visible.has(secret));
      });
    },
  };

  it("passes for both modes up to 10 players", () => {
    expect(() => runGameTestKit(battleship, adapter)).not.toThrow();
  }, 60_000);
});

describe("fleet helpers", () => {
  it("generates a legal random fleet", () => {
    for (let seed = 0; seed < 50; seed++) {
      const fleet = randomFleet(seededRandom(seed));
      expect(rejection(start(["a", "b"]), "a", { type: "ready", fleet })).toBeNull();
    }
  });
});
