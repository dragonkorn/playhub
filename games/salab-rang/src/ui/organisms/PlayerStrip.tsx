import type { PlayerId } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import type { Chip } from "../model/board";
import { PlayerChip } from "../molecules/PlayerChip";

/** Tailwind needs whole class names, so each count is spelled out. */
const WIDE = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6", "grid-cols-7", "grid-cols-8", "grid-cols-9", "grid-cols-10"];
const TALL = ["", "tall:grid-cols-1", "tall:grid-cols-2", "tall:grid-cols-3", "tall:grid-cols-4", "tall:grid-cols-5"];

export interface Picking {
  picked: PlayerId[];
  from?: PlayerId;
  off: PlayerId[];
  onPick: (player: PlayerId) => void;
}

/** W31 to W33: every player in turn order, fitting 10 without scrolling. */
export function PlayerStrip({ chips, nameOf, picking }: { chips: Chip[]; nameOf: (id: PlayerId) => string; picking?: Picking }) {
  const { t } = useTranslation("salab-rang");
  const count = Math.min(chips.length, 10);
  const marks = (chip: Chip, picked: boolean, from: boolean, off: boolean) =>
    [
      t("chip.coins", { name: nameOf(chip.id), count: chip.coins }),
      chip.current && t("chip.current"),
      chip.leader && t("chip.leader"),
      chip.near && t("chip.near"),
      chip.blessed && t("chip.blessed"),
      chip.muted && t("chip.muted"),
      chip.unhidden && t("chip.unhidden"),
      chip.answered && t("chip.answered"),
      chip.away && t("chip.away"),
      picked && t("chip.picked"),
      from && t("chip.from"),
      off && t("chip.off"),
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <ul aria-label={t("strip")} className={`m-0 grid flex-none list-none gap-1.5 p-0 ${WIDE[count]} ${TALL[Math.min(count, 5)]}`}>
      {chips.map((chip) => {
        const picked = picking?.picked.includes(chip.id) ?? false;
        const from = picking?.from === chip.id;
        const off = picking?.off.includes(chip.id) ?? false;
        return (
          <li key={chip.id} className="min-w-0">
            <PlayerChip
              {...chip}
              name={nameOf(chip.id)}
              label={marks(chip, picked, from, off)}
              picked={picked}
              from={from}
              off={off}
              onPick={picking ? () => picking.onPick(chip.id) : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}
