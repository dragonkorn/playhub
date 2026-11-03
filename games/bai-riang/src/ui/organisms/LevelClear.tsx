import { Button } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import { Lives } from "../molecules/Lives";
import { LIVES } from "../../logic/meta";

/** N19: the level is done; anyone starts the next one. */
export function LevelClear({ level, lives, onNext }: { level: number; lives: number; onNext: () => void }) {
  const { t } = useTranslation("bai-riang");
  return (
    <>
      <section className="flex grow flex-col items-center justify-center gap-4 text-center tall:gap-3">
        <h2 className="font-display text-8xl leading-tight font-extrabold tall:text-6xl">{t("clear.title", { level })}</h2>
        <Lives lives={lives} total={LIVES} label={t("lives", { count: lives })} size={40} />
        <p className="text-2xl text-muted tall:text-[17px]">{t("clear.next", { count: level + 1 })}</p>
      </section>
      <Button onClick={onNext} className="w-[480px] flex-none self-center font-display tall:h-18 tall:w-full tall:rounded-[18px]">
        {t("clear.button", { level: level + 1 })}
      </Button>
    </>
  );
}
