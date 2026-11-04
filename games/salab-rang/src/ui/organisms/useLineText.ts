import type { PlayerId } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import type { Role } from "../../logic/types";
import type { Line } from "../model/board";

type Card = { player: PlayerId; role: Role; owner: boolean };

/** Turns a public event line into text, naming players and roles (W39). */
export function useLineText(nameOf: (id: PlayerId) => string) {
  const { t } = useTranslation("salab-rang");
  const role = (r: unknown) => t(`role.${r as Role}.name`);
  const names = (ids: unknown, separator = ", ") => (ids as PlayerId[]).map(nameOf).join(separator);

  return (line: Line): string => {
    const p = line.params;
    switch (line.key) {
      case "event.reveal":
        return t(line.key, {
          cards: (p.cards as Card[]).map((c) => t("event.revealCard", { player: nameOf(c.player), role: role(c.role) }) + (c.owner ? " ✓" : "")).join(", "),
        });
      case "event.coins":
        return t(line.key, {
          changes: Object.entries(p.changes as Record<PlayerId, number>)
            .map(([id, n]) => `${nameOf(id)} ${n > 0 ? "+" : "−"}${Math.abs(n)}`)
            .join(", "),
        });
      default: {
        const player = p.player === undefined ? undefined : nameOf(p.player as PlayerId);
        return t(line.key, {
          player: p.via ? t("event.via", { player }) : player,
          target: p.target === undefined ? undefined : nameOf(p.target as PlayerId),
          targets: p.targets === undefined ? undefined : names(p.targets, line.key === "event.power.taxi" ? " → " : ", "),
          challengers: p.challengers === undefined ? undefined : names(p.challengers),
          role: p.role === undefined ? undefined : role(p.role),
        });
      }
    }
  };
}
