import type { PlayerId } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import { Heart } from "../atoms/Icon";
import { RevealTile } from "../molecules/RevealTile";
import type { Reveal } from "../../logic/types";

export interface MistakeBannerProps {
  reveal: Reveal;
  mine: boolean;
  lives: number;
  nameOf: (id: PlayerId) => string;
}

/** N21: who revealed what, the skipped numbers with their owners, and the lives lost. */
export function MistakeBanner({ reveal, mine, lives, nameOf }: MistakeBannerProps) {
  const { t } = useTranslation("bai-riang");
  const count = reveal.skipped.length;
  const body = mine
    ? t("mistake.mine", { name: nameOf(reveal.player), card: reveal.card })
    : t("mistake.others", { name: nameOf(reveal.player), card: reveal.card, count });

  return (
    <div className="br-fade absolute inset-0 z-20 flex items-center justify-center bg-ground/85 p-4">
      <div role="alert" className="flex w-[560px] flex-col items-center gap-4 rounded-3xl border-3 border-hit bg-panel p-8 text-center tall:w-full tall:px-6 tall:py-7">
        <h2 className="font-display text-6xl leading-tight font-extrabold text-hit tall:text-[44px]">{t("mistake.title")}</h2>
        <p className="text-xl tall:text-lg">{body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {reveal.skipped.map((s) => (
            <RevealTile key={s.card} card={s.card} name={nameOf(s.player)} size="lg" />
          ))}
        </div>
        <p className="text-lg text-muted tall:text-[15px]">{t("mistake.skipped", { count })}</p>
        <p className="flex items-center gap-2 font-display text-3xl font-bold tall:text-[22px]">
          <Heart filled size={30} />
          {t("mistake.lives", { lost: count, lives })}
        </p>
      </div>
    </div>
  );
}
