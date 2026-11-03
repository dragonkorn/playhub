import type { PlayerId } from "@playhub/game-contract";
import { SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";

/** L8: a team outcome lists everyone with no places. */
export function TeamList({ players, me, nameOf }: { players: PlayerId[]; me: PlayerId; nameOf: (id: PlayerId) => string }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("result.team")}</SectionLabel>
      <ul className="mb-3 grid grid-cols-2 gap-2">
        {players.map((id) => (
          <li key={id} className={`flex h-10 items-center truncate rounded-lg bg-panel px-4 text-lg font-bold tall:h-11 ${id === me ? "text-signal" : ""}`}>
            {id === me ? t("result.you", { name: nameOf(id) }) : nameOf(id)}
          </li>
        ))}
      </ul>
    </>
  );
}
