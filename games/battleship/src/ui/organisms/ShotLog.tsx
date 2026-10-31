import type { PlayerId } from "@playhub/game-contract";
import { SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import type { Shot } from "../../logic/types";
import { cellName } from "./BoardGrid";

const SHOWN = 7;

export function ShotLog({ shots, nameOf }: { shots: readonly Shot[]; nameOf: (id: PlayerId) => string }) {
  const { t } = useTranslation("battleship");
  return (
    <>
      <SectionLabel>{t("battle.log")}</SectionLabel>
      <ol className="flex min-h-0 flex-col gap-2 overflow-hidden">
        {[...shots].reverse().slice(0, SHOWN).map((shot, i) => (
          <li key={shots.length - i} className={`rounded-xl bg-panel px-3.5 py-2.5 text-base ${shot.result === "sunk" ? "font-bold text-hit" : ""}`}>
            {t(`log.${shot.result}`, {
              shooter: nameOf(shot.shooter),
              target: nameOf(shot.target),
              cell: cellName(shot),
              ship: shot.ship ? t(`ship.${shot.ship}`) : "",
            })}
          </li>
        ))}
      </ol>
    </>
  );
}
