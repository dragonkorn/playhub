import type { PlayerId } from "@playhub/game-contract";
import { SHIP_IDS } from "../../logic/fleet";
import type { Placement, Shot, ShipId, View } from "../../logic/types";

export const STAGE_MS = { flight: 600, miss: 500, hit: 900, sunk: 1800, eliminated: 2500 };
export type Stage = keyof typeof STAGE_MS;

const sunkShips = (shots: readonly Shot[], target: PlayerId): ShipId[] =>
  shots.flatMap((s) => (s.target === target && s.ship ? [s.ship] : []));

export function stagesFor(shots: readonly Shot[], index: number): Stage[] {
  const shot = shots[index];
  if (!shot) return [];
  const stages: Stage[] = ["flight", shot.result];
  const sunkSoFar = sunkShips(shots.slice(0, index + 1), shot.target).length;
  if (shot.result === "sunk" && sunkSoFar === SHIP_IDS.length) stages.push("eliminated");
  return stages;
}

/** The view as it stood when only the first `revealed` shots had landed. */
export function revealedView(view: View, revealed: number): View {
  const shots = view.shots.slice(0, revealed);
  const players = Object.keys(view.shipsLeft);
  return {
    ...view,
    shots,
    sunk: Object.fromEntries(
      players.map((p) => {
        const names = sunkShips(shots, p);
        return [p, (view.sunk[p] ?? []).filter((placement) => names.includes(placement.ship))];
      }),
    ),
    shipsLeft: Object.fromEntries(players.map((p) => [p, SHIP_IDS.length - sunkShips(shots, p).length])),
    out: view.out.filter((p) => view.shipsLeft[p] !== 0 || sunkShips(shots, p).length === SHIP_IDS.length),
  };
}

interface CameraInput {
  me: PlayerId;
  /** The shot playing now. */
  shot: Shot | null;
  browsing: PlayerId;
  /** The board this player is aiming at, on their turn. */
  aimingAt: PlayerId | null;
}

/** Shot camera (B30): which board this screen shows. */
export function shownBoard({ shot, browsing, aimingAt }: CameraInput): PlayerId {
  return shot?.target ?? aimingAt ?? browsing;
}

/** Everything drawn for one board. Other players' boards hold only public data (B31). */
export function boardFor(view: View, id: PlayerId, me: PlayerId) {
  const sunk: Placement[] = view.sunk[id] ?? [];
  return {
    ships: id === me ? (view.myFleet ?? []) : sunk,
    sunk,
    shots: view.shots.filter((s) => s.target === id),
  };
}
