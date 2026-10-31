import type { Cell, Placement, ShipId } from "./types";

export const BOARD_SIZE = 10;

export const FLEET: Record<ShipId, number> = {
  carrier: 5,
  battleship: 4,
  cruiser: 3,
  submarine: 3,
  destroyer: 2,
};

export const SHIP_IDS = Object.keys(FLEET) as ShipId[];

export const onBoard = (row: number, col: number) =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

export function cellsOf(placement: Placement): Cell[] {
  const { ship, row, col, orientation } = placement;
  return Array.from({ length: FLEET[ship] }, (_, i) =>
    orientation === "horizontal" ? { row, col: col + i } : { row: row + i, col },
  );
}

export function isValidFleet(fleet: readonly Placement[]): boolean {
  if (fleet.length !== SHIP_IDS.length) return false;
  if (new Set(fleet.map((p) => p.ship)).size !== SHIP_IDS.length) return false;

  const taken = new Set<string>();
  for (const cell of fleet.flatMap(cellsOf)) {
    const key = `${cell.row},${cell.col}`;
    if (!onBoard(cell.row, cell.col) || taken.has(key)) return false;
    taken.add(key);
  }
  return true;
}

/** Can this ship go here, given the other ships already placed? */
export function fits(placement: Placement, others: readonly Placement[]): boolean {
  const taken = new Set(others.flatMap(cellsOf).map((c) => `${c.row},${c.col}`));
  return cellsOf(placement).every((c) => onBoard(c.row, c.col) && !taken.has(`${c.row},${c.col}`));
}

export function randomFleet(random: () => number): Placement[] {
  const fleet: Placement[] = [];
  for (const ship of SHIP_IDS) {
    for (;;) {
      const placement: Placement = {
        ship,
        row: Math.floor(random() * BOARD_SIZE),
        col: Math.floor(random() * BOARD_SIZE),
        orientation: random() < 0.5 ? "horizontal" : "vertical",
      };
      if (fits(placement, fleet)) {
        fleet.push(placement);
        break;
      }
    }
  }
  return fleet;
}
