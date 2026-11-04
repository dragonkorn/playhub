import { useTranslation } from "react-i18next";
import { Icon } from "../atoms/Icon";

const BUTTON = "flex h-12 flex-none items-center justify-center gap-2 rounded-xl border-2 border-sr-line px-3.5 font-bold tall:size-11 tall:rounded-lg tall:px-0";

export interface TopBarProps {
  /** Left out before the first turn and after the end. */
  round?: number;
  rounds: number;
  goal: number;
  onHistory: () => void;
  onGuide: () => void;
}

export function TopBar({ round, rounds, goal, onHistory, onGuide }: TopBarProps) {
  const { t } = useTranslation("salab-rang");
  return (
    <header className="flex h-12 flex-none items-center gap-2 tall:h-11">
      <h1 className="m-0 grow font-display text-[26px] font-bold tall:text-[22px]">
        {round === undefined ? (
          t("start")
        ) : (
          <>
            {t("round", { round })}
            <span className="font-medium text-sr-muted">/{rounds}</span>
          </>
        )}{" "}
        <span className="text-lg font-medium text-sr-muted tall:text-base">· {t("goalLong", { goal })}</span>
      </h1>
      <button type="button" aria-label={t("history")} onClick={onHistory} className={BUTTON}>
        <Icon name="history" />
        <span className="tall:sr-only">{t("history")}</span>
      </button>
      <button type="button" aria-label={t("guide")} onClick={onGuide} className={BUTTON}>
        <Icon name="guide" />
        <span className="tall:sr-only">{t("guide")}</span>
      </button>
    </header>
  );
}
