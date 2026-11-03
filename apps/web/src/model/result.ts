import type { Message, RoomSnapshot } from "@playhub/game-contract";

/** What the result screen says: L6 and L7 for ranked games, L8 and L9 for a team. */
export function resultOf(snapshot: RoomSnapshot, resultLine?: (view: unknown) => Message) {
  const ranking = snapshot.ranking ?? [];
  const team = snapshot.team !== null;
  const draw = !team && (ranking[0]?.length ?? 0) > 1;
  const title = team
    ? { key: snapshot.team === "won" ? "result.teamWon" : "result.teamLost" }
    : draw
      ? { key: "result.draw" }
      : { key: "result.wins", winner: ranking[0]?.[0] ?? "" };
  const custom = resultLine && snapshot.view != null ? resultLine(snapshot.view) : null;
  const line = custom ? { key: custom.code, ...(custom.params ? { params: custom.params } : {}) } : { key: draw ? "result.draw" : "result.win" };
  return { title, line, team };
}
