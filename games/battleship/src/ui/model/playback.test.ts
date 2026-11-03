import { describe, expect, it } from "vitest";
import type { Placement, Shot, View } from "../../logic/types";
import { STAGE_MS, boardFor, revealedView, shownBoard, stagesFor } from "./playback";

const miss = (shooter: string, target: string, row = 9): Shot => ({ shooter, target, row, col: 0, result: "miss" });
const sunk = (target: string, ship: Shot["ship"], row = 0): Shot => ({ shooter: "a", target, row, col: 0, result: "sunk", ship });
const destroyer: Placement = { ship: "destroyer", row: 0, col: 0, orientation: "horizontal" };
const cruiser: Placement = { ship: "cruiser", row: 1, col: 0, orientation: "horizontal" };

const view = (overrides: Partial<View> = {}): View => ({
  phase: "battle",
  targeting: "free",
  ready: ["a", "b", "c"],
  turnOrder: ["a", "b", "c"],
  current: "a",
  forcedTarget: null,
  shots: [],
  myFleet: [cruiser],
  sunk: { a: [], b: [], c: [] },
  shipsLeft: { a: 5, b: 5, c: 5 },
  out: [],
  allFleets: null,
  ...overrides,
});

describe("stages of a shot (B32)", () => {
  it("plays flight, then the result", () => {
    const shots = [miss("a", "b")];
    expect(stagesFor(shots, 0)).toEqual(["flight", "miss"]);
  });

  it("uses the spec's timing", () => {
    expect(STAGE_MS).toEqual({ flight: 600, miss: 500, hit: 900, sunk: 1800, eliminated: 2500 });
  });

  it("adds the eliminated moment on a player's fifth sunk ship", () => {
    const ships = ["carrier", "battleship", "cruiser", "submarine", "destroyer"] as const;
    const shots = ships.map((ship) => sunk("b", ship));
    expect(stagesFor(shots, 3)).toEqual(["flight", "sunk"]);
    expect(stagesFor(shots, 4)).toEqual(["flight", "sunk", "eliminated"]);
  });
});

describe("hiding results until they land (B32)", () => {
  const shots = [miss("a", "b"), sunk("b", "destroyer"), sunk("b", "cruiser")];
  const full = view({
    shots,
    sunk: { a: [], b: [destroyer, cruiser], c: [] },
    shipsLeft: { a: 5, b: 3, c: 5 },
  });

  it("shows only shots that have landed", () => {
    expect(revealedView(full, 1).shots).toEqual([shots[0]]);
  });

  it("keeps a ship unsunk until its shot lands", () => {
    const partial = revealedView(full, 2);
    expect(partial.sunk.b).toEqual([destroyer]);
    expect(partial.shipsLeft.b).toBe(4);
  });

  it("keeps a player in until their last ship's shot lands", () => {
    const ships = ["carrier", "battleship", "cruiser", "submarine", "destroyer"] as const;
    const log = ships.map((ship) => sunk("b", ship));
    const done = view({ shots: log, shipsLeft: { a: 5, b: 0, c: 5 }, out: ["b"] });
    expect(revealedView(done, 4).out).toEqual([]);
    expect(revealedView(done, 5).out).toEqual(["b"]);
  });

  it("keeps a lost player out, since no shot removed them", () => {
    const lost = view({ out: ["c"], shipsLeft: { a: 5, b: 5, c: 4 } });
    expect(revealedView(lost, 0).out).toEqual(["c"]);
  });
});

describe("shot camera (B30)", () => {
  const shot = miss("a", "b");

  it("shows the target's board to everyone else", () => {
    expect(shownBoard({ me: "c", shot, browsing: "c", aimingAt: null })).toBe("b");
    expect(shownBoard({ me: "a", shot, browsing: "a", aimingAt: null })).toBe("b");
  });

  it("keeps the target on their own fleet", () => {
    expect(shownBoard({ me: "b", shot, browsing: "c", aimingAt: null })).toBe("b");
  });

  it("returns to the browsed board after the shot", () => {
    expect(shownBoard({ me: "c", shot: null, browsing: "a", aimingAt: null })).toBe("a");
  });

  it("shows the chosen target on the player's own turn", () => {
    expect(shownBoard({ me: "a", shot: null, browsing: "a", aimingAt: "c" })).toBe("c");
  });
});

describe("browsing (B31)", () => {
  it("shows a player their own whole fleet", () => {
    expect(boardFor(view(), "a", "a").ships).toEqual([cruiser]);
  });

  it("shows another board with public data only", () => {
    const shots = [miss("a", "b")];
    const board = boardFor(view({ shots, sunk: { a: [], b: [destroyer], c: [] } }), "b", "a");
    expect(board.ships).toEqual([destroyer]);
    expect(board.shots).toEqual(shots);
    expect(JSON.stringify(board)).not.toContain("cruiser");
  });
});
