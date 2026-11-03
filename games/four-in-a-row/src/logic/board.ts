import type { Cell, Drop } from "./types";

export const COLUMNS = 7;
export const ROWS = 6;

export const onBoard = (column: number) => column >= 0 && column < COLUMNS;

export const heightOf = (drops: readonly Drop[], column: number) => drops.filter((d) => d.column === column).length;

export const isFull = (drops: readonly Drop[], column: number) => heightOf(drops, column) >= ROWS;

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

const key = (cell: Cell) => `${cell.row},${cell.column}`;

/** Every cell of every run of 4 or more through `last`, of the same player (F7, F8). */
export function linesThrough(drops: readonly Drop[], last: Drop): Cell[] {
  const owner = new Map(drops.map((d) => [key(d), d.player]));
  const cells = new Map<string, Cell>();
  for (const [dr, dc] of DIRECTIONS) {
    const run: Cell[] = [{ row: last.row, column: last.column }];
    for (const sign of [1, -1]) {
      let cell = { row: last.row + dr * sign, column: last.column + dc * sign };
      while (owner.get(key(cell)) === last.player) {
        run.push(cell);
        cell = { row: cell.row + dr * sign, column: cell.column + dc * sign };
      }
    }
    if (run.length >= 4) for (const cell of run) cells.set(key(cell), cell);
  }
  return [...cells.values()];
}
