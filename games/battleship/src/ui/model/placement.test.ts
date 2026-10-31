import { seededRandom } from "@playhub/game-contract/testing";
import { describe, expect, it } from "vitest";
import { isValidFleet, randomFleet } from "../../logic/fleet";
import type { Placement } from "../../logic/types";
import { canPlace, cellFromPoint, isComplete, parseDraft, placeShip, rotateShip, shuffled, toFleet } from "./placement";

const carrier: Placement = { ship: "carrier", row: 0, col: 0, orientation: "horizontal" };
const destroyer: Placement = { ship: "destroyer", row: 1, col: 0, orientation: "horizontal" };

describe("placing ships", () => {
  it("adds a ship that fits", () => {
    expect(placeShip({}, carrier)).toEqual({ carrier });
  });

  it("moves a ship already on the board", () => {
    const draft = placeShip({ carrier }, { ...carrier, row: 5 });
    expect(draft.carrier?.row).toBe(5);
  });

  it("allows a ship to move onto its own old cells", () => {
    expect(canPlace({ carrier }, { ...carrier, col: 1 })).toBe(true);
  });

  it("leaves the draft unchanged on an invalid spot (B27)", () => {
    const draft = { carrier, destroyer };
    expect(placeShip(draft, { ...destroyer, row: 0 })).toBe(draft);
    expect(placeShip(draft, { ...destroyer, col: 9 })).toBe(draft);
  });
});

describe("rotating", () => {
  it("rotates a ship in place", () => {
    expect(rotateShip({ destroyer }, "destroyer").destroyer?.orientation).toBe("vertical");
  });

  it("keeps the ship when rotating doesn't fit", () => {
    const edge: Placement = { ship: "carrier", row: 8, col: 0, orientation: "horizontal" };
    expect(rotateShip({ carrier: edge }, "carrier").carrier).toEqual(edge);
  });

  it("ignores a ship that isn't placed", () => {
    expect(rotateShip({}, "carrier")).toEqual({});
  });
});

describe("completing the fleet", () => {
  it("needs all 5 ships", () => {
    expect(isComplete({ carrier })).toBe(false);
    const fleet = shuffled(seededRandom(1));
    expect(isComplete(fleet)).toBe(true);
    expect(isValidFleet(toFleet(fleet))).toBe(true);
  });
});

describe("dragging (B27)", () => {
  const geometry = { left: 100, top: 50, pitch: 56, labelX: 26, labelY: 22 };

  it("centers a horizontal ship on the point, snapped to cells", () => {
    const cell = cellFromPoint({ x: 100 + 26 + 56 * 4 + 28, y: 50 + 22 + 56 * 2 + 28 }, 3, "horizontal", geometry);
    expect(cell).toEqual({ row: 2, col: 3 });
  });

  it("centers a vertical ship on the point", () => {
    const cell = cellFromPoint({ x: 100 + 26 + 56 * 4 + 28, y: 50 + 22 + 56 * 5 + 28 }, 3, "vertical", geometry);
    expect(cell).toEqual({ row: 4, col: 4 });
  });
});

describe("draft storage (B4)", () => {
  it("restores a valid partial draft", () => {
    expect(parseDraft({ carrier })).toEqual({ carrier });
  });

  it.each([[null], ["x"], [{ carrier: { ...carrier, col: 9 } }], [{ yacht: carrier }]])("drops bad data %j", (raw) => {
    expect(parseDraft(raw)).toEqual({});
  });

  it("restores a generated fleet", () => {
    const fleet = randomFleet(seededRandom(2));
    const draft = Object.fromEntries(fleet.map((p) => [p.ship, p]));
    expect(toFleet(parseDraft(JSON.parse(JSON.stringify(draft))))).toHaveLength(5);
  });
});
