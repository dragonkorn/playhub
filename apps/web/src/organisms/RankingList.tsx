import type { PlayerId } from "@playhub/game-contract";
import { SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";

export function RankingList({ ranking, me, nameOf }: { ranking: PlayerId[]; me: PlayerId; nameOf: (id: PlayerId) => string }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("result.order")}</SectionLabel>
      <ol className="mb-3 flex flex-col gap-1.5">
        {ranking.map((id, i) => (
          <li key={id} className={`flex h-10 items-center rounded-lg bg-panel px-4 text-lg font-medium ${id === me ? "text-signal" : ""}`}>
            {i + 1}. {nameOf(id)}
          </li>
        ))}
      </ol>
    </>
  );
}
