import { BOARD_SIZE, FLEET, SHIP_IDS, fits, randomFleet } from "../logic/fleet";
import type { Cell, Placement, ShipId, ShipOrientation } from "../logic/types";

export type Draft = Partial<Record<ShipId, Placement>>;

const othersThan = (draft: Draft, ship: ShipId) =>
  Object.values(draft).filter((p) => p.ship !== ship);

export const canPlace = (draft: Draft, placement: Placement) =>
  fits(placement, othersThan(draft, placement.ship));

export const placeShip = (draft: Draft, placement: Placement): Draft =>
  canPlace(draft, placement) ? { ...draft, [placement.ship]: placement } : draft;

export function rotateShip(draft: Draft, ship: ShipId): Draft {
  const placement = draft[ship];
  if (!placement) return draft;
  const orientation: ShipOrientation = placement.orientation === "horizontal" ? "vertical" : "horizontal";
  return placeShip(draft, { ...placement, orientation });
}

export const isComplete = (draft: Draft) => SHIP_IDS.every((ship) => draft[ship]);

export const toFleet = (draft: Draft): Placement[] => SHIP_IDS.flatMap((ship) => draft[ship] ?? []);

export const shuffled = (random: () => number): Draft =>
  Object.fromEntries(randomFleet(random).map((p) => [p.ship, p]));

export function parseDraft(raw: unknown): Draft {
  if (typeof raw !== "object" || raw === null) return {};
  let draft: Draft = {};
  for (const [ship, value] of Object.entries(raw)) {
    if (!SHIP_IDS.includes(ship as ShipId) || typeof value !== "object" || value === null) continue;
    const { row, col, orientation } = value as Placement;
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
    if (orientation !== "horizontal" && orientation !== "vertical") continue;
    draft = placeShip(draft, { ship: ship as ShipId, row, col, orientation });
  }
  return draft;
}

export interface BoardGeometry {
  left: number;
  top: number;
  /** Distance between cell starts, in screen pixels. */
  pitch: number;
  labelX: number;
  labelY: number;
}

/** The ship's first cell when centered on a screen point. */
export function cellFromPoint(
  point: { x: number; y: number },
  length: number,
  orientation: ShipOrientation,
  { left, top, pitch, labelX, labelY }: BoardGeometry,
): Cell {
  const x = (point.x - left - labelX) / pitch;
  const y = (point.y - top - labelY) / pitch;
  const horizontal = orientation === "horizontal";
  return {
    row: Math.round(horizontal ? y - 0.5 : y - length / 2),
    col: Math.round(horizontal ? x - length / 2 : x - 0.5),
  };
}

export const shipLength = (ship: ShipId) => FLEET[ship];
export { BOARD_SIZE };
