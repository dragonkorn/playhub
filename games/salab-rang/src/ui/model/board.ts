import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import type { Event, Role, View } from "../../logic/types";

export type Screen =
  | { kind: "memorize"; hidden: boolean }
  | { kind: "waiting" }
  | { kind: "turn" }
  | { kind: "peek"; role: Role | null }
  | { kind: "claimed" }
  | { kind: "challenge" }
  | { kind: "revealed"; role: Role; owner: boolean; acting: boolean }
  | { kind: "power"; role: Role }
  | { kind: "secret" }
  | { kind: "shown"; role: Role }
  | { kind: "massage"; role: Role | null }
  | { kind: "finished" };

/** Which screen this viewer's phone shows (W9 to W27). */
export function screenOf(view: View, me: PlayerId): Screen {
  const seated = view.order.includes(me);
  const acting = view.actor === me;
  switch (view.phase) {
    case "finished":
      return { kind: "finished" };
    case "memorize":
      return seated ? { kind: "memorize", hidden: view.hidden.includes(me) } : { kind: "waiting" };
    case "turn":
      return view.current === me ? { kind: "turn" } : { kind: "waiting" };
    case "peek":
      return view.current === me ? { kind: "peek", role: view.cards[me] ?? null } : { kind: "waiting" };
    case "challenge":
      if (!seated) return { kind: "waiting" };
      return view.claim?.player === me ? { kind: "claimed" } : { kind: "challenge" };
    case "reveal": {
      const role = view.cards[me];
      if (!role) return { kind: "waiting" };
      return { kind: "revealed", role, owner: role === view.claim?.role, acting };
    }
    case "power":
      return acting && view.claim ? { kind: "power", role: view.claim.role } : { kind: "waiting" };
    case "secret":
      return acting ? { kind: "secret" } : { kind: "waiting" };
    case "shown": {
      const role = view.cards[me];
      return acting && role ? { kind: "shown", role } : { kind: "waiting" };
    }
    case "massage":
      return acting ? { kind: "massage", role: view.cards[me] ?? null } : { kind: "waiting" };
  }
}

export interface Chip {
  id: PlayerId;
  coins: number;
  me: boolean;
  current: boolean;
  leader: boolean;
  near: boolean;
  blessed: boolean;
  muted: boolean;
  unhidden: boolean;
  answered: boolean;
  away: boolean;
}

/** W31: coins within 3 of the goal turn orange. */
export const nearGoal = (coins: number, goal: number) => coins >= goal - 3;

/** W31, W32: one chip per player in turn order, starting from the viewer. */
export function stripOf(view: View, me: PlayerId, players: readonly RoomPlayer[]): Chip[] {
  const start = Math.max(0, view.order.indexOf(me));
  const order = [...view.order.slice(start), ...view.order.slice(0, start)];
  const amounts = order.map((p) => view.coins[p] ?? 0);
  const most = Math.max(...amounts);
  const least = Math.min(...amounts);
  const turnOf = view.phase === "challenge" ? view.claim?.player : view.current;
  return order.map((id) => {
    const coins = view.coins[id] ?? 0;
    const seat = players.find((p) => p.id === id);
    return {
      id,
      coins,
      me: id === me,
      current: id === turnOf,
      leader: coins === most && most > least,
      near: nearGoal(coins, view.goal),
      blessed: view.blessed.includes(id),
      muted: view.muted.includes(id),
      unhidden: view.phase === "memorize" && !view.hidden.includes(id),
      answered: view.phase === "challenge" && view.answered.includes(id),
      away: seat !== undefined && seat.connection !== "online",
    };
  });
}

/** W11: players this player may swap with. */
export const swappable = (view: View, me: PlayerId) => view.order.filter((p) => p !== me && !view.blessed.includes(p));

/** W13: roles a player may claim. */
export const claimable = (view: View): Role[] => view.deck.filter((r) => r !== "dog");

export interface Line {
  key: string;
  params: Record<string, unknown>;
}

function lineOf(event: Event): Line {
  switch (event.kind) {
    case "swap":
      return { key: "event.swap", params: { player: event.player, target: event.target } };
    case "peek":
      return { key: "event.peek", params: { player: event.player } };
    case "claim":
      return event.challengers.length > 0
        ? { key: "event.claimChallenged", params: { player: event.player, role: event.role, challengers: event.challengers } }
        : { key: "event.claim", params: { player: event.player, role: event.role } };
    case "reveal":
      return { key: "event.reveal", params: { cards: event.cards } };
    case "gossip":
      return { key: "event.gossip", params: { target: event.target, role: event.role } };
    case "coins":
      return { key: "event.coins", params: { changes: event.changes } };
    case "power": {
      if (event.skipped) return { key: "event.power.skipped", params: { player: event.player, role: event.role } };
      const role = event.as ?? event.role;
      const variant = event.caught ? "caught" : event.found ? "found" : role;
      const params: Record<string, unknown> = { player: event.player, targets: event.targets };
      if (event.as) params.via = event.role;
      return { key: `event.power.${variant}`, params };
    }
  }
}

/** W39: public history, newest first. */
export const eventLines = (log: readonly Event[]): Line[] => [...log].reverse().map(lineOf);
