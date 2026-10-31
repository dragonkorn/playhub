import type { GameDefinition, MoveResult, Outcome, PlayerId } from "@playhub/game-contract";
import { SHIP_IDS, cellsOf, isValidFleet, onBoard } from "./fleet";
import { meta } from "./meta";
import type { Move, Options, Placement, Shot, ShipId, State, View } from "./types";

export type { Move, Options, View } from "./types";

const inGame = (state: State) => state.turnOrder.filter((p) => !state.out.includes(p));

function nextPlayer(state: State, from: PlayerId): PlayerId | null {
  const order = state.turnOrder;
  const start = order.indexOf(from);
  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(start + i) % order.length] as PlayerId;
    if (candidate !== from && !state.out.includes(candidate)) return candidate;
  }
  return null;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** B7 and B16: moves the game on when phase conditions are met. */
function advance(state: State, random: () => number): State {
  const remaining = inGame(state);
  if (remaining.length <= 1) return { ...state, phase: "finished", current: null };
  if (state.phase === "setup" && remaining.every((p) => state.fleets[p])) {
    const turnOrder = shuffle(remaining, random);
    return { ...state, phase: "battle", turnOrder, current: turnOrder[0] ?? null };
  }
  return state;
}

function ready(state: State, player: PlayerId, fleet: Placement[], random: () => number): MoveResult<State> {
  if (state.phase !== "setup") return { ok: false, code: "wrong_phase" };
  if (state.fleets[player]) return { ok: false, code: "already_ready" };
  if (!isValidFleet(fleet)) return { ok: false, code: "invalid_fleet" };
  return { ok: true, state: advance({ ...state, fleets: { ...state.fleets, [player]: fleet } }, random) };
}

function resolveShot(state: State, shooter: PlayerId, target: PlayerId, row: number, col: number): Shot {
  const fleet = state.fleets[target] ?? [];
  const placement = fleet.find((p) => cellsOf(p).some((c) => c.row === row && c.col === col));
  if (!placement) return { shooter, target, row, col, result: "miss" };

  const shotCells = new Set(state.shots.filter((s) => s.target === target).map((s) => `${s.row},${s.col}`));
  shotCells.add(`${row},${col}`);
  const sunk = cellsOf(placement).every((c) => shotCells.has(`${c.row},${c.col}`));
  return sunk
    ? { shooter, target, row, col, result: "sunk", ship: placement.ship }
    : { shooter, target, row, col, result: "hit" };
}

const sunkShips = (state: State, target: PlayerId): ShipId[] =>
  state.shots.flatMap((s) => (s.target === target && s.ship ? [s.ship] : []));

function fire(state: State, player: PlayerId, target: PlayerId, row: number, col: number, random: () => number): MoveResult<State> {
  if (state.phase !== "battle") return { ok: false, code: "wrong_phase" };
  if (player !== state.current) return { ok: false, code: "not_your_turn" };
  if (!onBoard(row, col)) return { ok: false, code: "off_board" };

  const legalTarget = target !== player && inGame(state).includes(target);
  const forced = state.options.targeting === "robin" ? nextPlayer(state, player) : target;
  if (!legalTarget || target !== forced) return { ok: false, code: "invalid_target" };

  const repeat = state.shots.some((s) => s.target === target && s.row === row && s.col === col);
  if (repeat) return { ok: false, code: "already_shot" };

  const shot = resolveShot(state, player, target, row, col);
  const shots = [...state.shots, shot];
  const eliminated = sunkShips({ ...state, shots }, target).length === SHIP_IDS.length;
  const out = eliminated ? [...state.out, target] : state.out;
  const next: State = { ...state, shots, out };
  return { ok: true, state: advance({ ...next, current: nextPlayer(next, player) }, random) };
}

const isCell = (value: unknown): value is number => Number.isInteger(value);

function parsePlacement(raw: unknown): Placement | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { ship, row, col, orientation } = raw as Record<string, unknown>;
  if (!SHIP_IDS.includes(ship as ShipId) || !isCell(row) || !isCell(col)) return null;
  if (orientation !== "horizontal" && orientation !== "vertical") return null;
  return { ship: ship as ShipId, row, col, orientation };
}

export const battleship: GameDefinition<State, Move, View, Options> = {
  meta,
  defaultOptions: { targeting: "free" },

  parseOptions(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const { targeting } = raw as Record<string, unknown>;
    return targeting === "free" || targeting === "robin" ? { targeting } : null;
  },

  parseMove(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const move = raw as Record<string, unknown>;
    if (move.type === "fire") {
      const { target, row, col } = move;
      return typeof target === "string" && isCell(row) && isCell(col)
        ? { type: "fire", target, row, col }
        : null;
    }
    if (move.type === "ready" && Array.isArray(move.fleet)) {
      const fleet = move.fleet.map(parsePlacement);
      return fleet.every((p) => p !== null) ? { type: "ready", fleet: fleet as Placement[] } : null;
    }
    return null;
  },

  setup({ players, options }) {
    return {
      phase: "setup",
      options,
      fleets: Object.fromEntries(players.map((p) => [p, null])),
      turnOrder: [...players],
      current: null,
      shots: [],
      out: [],
    };
  },

  applyMove(state, player, move, random) {
    return move.type === "ready"
      ? ready(state, player, move.fleet, random)
      : fire(state, player, move.target, move.row, move.col, random);
  },

  activePlayers(state) {
    if (state.phase === "setup") return inGame(state).filter((p) => !state.fleets[p]);
    return state.current ? [state.current] : [];
  },

  eliminatedPlayers(state) {
    return state.out;
  },

  removePlayer(state, player, random) {
    if (state.out.includes(player)) return state;
    const out = [...state.out, player];
    const current = state.current === player ? nextPlayer({ ...state, out }, player) : state.current;
    return advance({ ...state, out, current }, random);
  },

  outcome(state): Outcome {
    if (state.phase !== "finished") return { done: false };
    const remaining = inGame(state).map((p) => [p]);
    return { done: true, ranking: [...remaining, ...[...state.out].reverse().map((p) => [p])] };
  },

  viewFor(state, viewer) {
    const players = Object.keys(state.fleets);
    const sunkOf = (player: PlayerId) => {
      const names = sunkShips(state, player);
      return (state.fleets[player] ?? []).filter((p) => names.includes(p.ship));
    };
    const canShoot = state.phase === "battle" && viewer === state.current && viewer !== null;
    return {
      phase: state.phase,
      targeting: state.options.targeting,
      ready: players.filter((p) => state.fleets[p]),
      turnOrder: state.turnOrder,
      current: state.current,
      forcedTarget: canShoot && state.options.targeting === "robin" ? nextPlayer(state, viewer) : null,
      shots: state.shots,
      myFleet: viewer === null ? null : (state.fleets[viewer] ?? null),
      sunk: Object.fromEntries(players.map((p) => [p, sunkOf(p)])),
      shipsLeft: Object.fromEntries(players.map((p) => [p, SHIP_IDS.length - sunkShips(state, p).length])),
      out: state.out,
      allFleets:
        state.phase === "finished"
          ? Object.fromEntries(players.flatMap((p) => (state.fleets[p] ? [[p, state.fleets[p]]] : [])))
          : null,
    };
  },
};
