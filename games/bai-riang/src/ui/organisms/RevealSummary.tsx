import type { PlayerId } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import { RevealTile } from "../molecules/RevealTile";
import type { Reveal } from "../../logic/types";

/** N20: the final level's reveals, opened from the result screen. */
export function RevealSummary({ level, reveals, nameOf }: { level: number; reveals: readonly Reveal[]; nameOf: (id: PlayerId) => string }) {
  const { t } = useTranslation("bai-riang");
  const tiles = reveals.flatMap((r) => [...r.skipped.map((s) => ({ ...s, skipped: true })), { player: r.player, card: r.card, skipped: false }]);
  return (
    <section className="flex grow flex-col gap-4 pb-20">
      <h2 className="font-display text-4xl font-bold tall:text-3xl">
        {t("level", { level })} · {t("result.boards")}
      </h2>
      <div className="flex flex-wrap content-start gap-3">
        {tiles.map((tile) => (
          <RevealTile key={tile.card} card={tile.card} name={nameOf(tile.player)} skipped={tile.skipped} size="lg" />
        ))}
      </div>
    </section>
  );
}
