import { useTranslation } from "react-i18next";
import { useHold } from "../model/use-hold";

export interface RevealButtonProps {
  /** The number a reveal would show, or null when the player holds none. */
  card: number | null;
  hidden: boolean;
  position: number;
  count: number;
  disabled: boolean;
  onReveal: () => void;
}

/** N16, N17: a 1 second hold reveals. The bar along the bottom edge shows progress. */
export function RevealButton({ card, hidden, position, count, disabled, onReveal }: RevealButtonProps) {
  const { t } = useTranslation("bai-riang");
  const enabled = card !== null && !disabled;
  const { holding, progress, press, release } = useHold(onReveal, enabled);

  const title = card === null ? t("hold.done") : hidden ? t("hold.yours") : t("hold.card", { card });
  const detail = card === null ? t("hold.wait") : holding ? t("hold.more") : t("hold.position", { position, count });

  return (
    <div className="relative flex flex-none flex-col">
      {/* Drawn over the space above, so holding never moves the button. */}
      {holding && <p className="absolute inset-x-0 -top-9 text-center text-base font-bold text-signal tall:text-[15px]">{t("hold.release")}</p>}
      <button
        type="button"
        disabled={!enabled}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) press();
        }}
        onKeyUp={release}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative flex h-20 touch-none flex-col items-center justify-center overflow-hidden rounded-[20px] border-3 font-display text-2xl leading-tight font-bold disabled:border-line disabled:text-muted tall:h-18 tall:rounded-[18px] tall:text-xl ${
          holding ? "border-signal bg-signal text-ground" : "border-signal"
        }`}
      >
        {title}
        <span className={`font-body text-sm font-medium tall:text-[13px] ${holding ? "" : "text-muted"}`}>{detail}</span>
        {holding && (
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2 bg-ground/25">
            <span className="block h-full bg-ground" style={{ width: `${progress * 100}%` }} />
          </span>
        )}
      </button>
    </div>
  );
}
