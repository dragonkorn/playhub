import type { PlayerId } from "@playhub/game-contract";
import { SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import type { Drop } from "../../logic/types";
import { Disc, type DiscColor } from "../atoms/Disc";

const SHOWN = 6;

export interface MoveLogProps {
  drops: readonly Drop[];
  nameOf: (id: PlayerId) => string;
  colorOf: (id: PlayerId) => DiscColor;
}

export function MoveLog({ drops, nameOf, colorOf }: MoveLogProps) {
  const { t } = useTranslation("four-in-a-row");
  return (
    <>
      <SectionLabel>{t("log.title")}</SectionLabel>
      <ol className="flex min-h-0 flex-col gap-2 overflow-hidden">
        {[...drops].reverse().slice(0, SHOWN).map((drop, i) => (
          <li key={drops.length - i} className="flex items-center gap-2.5 rounded-xl bg-panel px-3.5 py-2.5 text-base">
            <Disc color={colorOf(drop.player)} size={18} />
            {t("log.drop", { name: nameOf(drop.player), column: drop.column + 1 })}
          </li>
        ))}
      </ol>
    </>
  );
}
