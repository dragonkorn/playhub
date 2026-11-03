import type { PlayerId } from "@playhub/game-contract";
import { SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";

/** Tied players share a place (L6). */
export function RankingList({ ranking, me, nameOf }: { ranking: PlayerId[][]; me: PlayerId; nameOf: (id: PlayerId) => string }) {
  const places = ranking.flatMap((group, i) => group.map((id) => ({ id, place: ranking.slice(0, i).flat().length + 1 })));
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("result.order")}</SectionLabel>
      <ol className="mb-3 flex flex-col gap-1.5">
        {places.map(({ id, place }) => (
          <li key={id} className={`flex h-10 items-center rounded-lg bg-panel px-4 text-lg font-medium ${id === me ? "text-signal" : ""}`}>
            {place}. {nameOf(id)}
          </li>
        ))}
      </ol>
    </>
  );
}
