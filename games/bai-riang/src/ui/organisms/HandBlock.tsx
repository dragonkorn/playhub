import { useTranslation } from "react-i18next";
import { Icon } from "../atoms/Icon";
import { HandSlot } from "../molecules/HandSlot";
import type { SlotState } from "../model/feedback";

export interface HandBlockProps {
  next: number | null;
  slots: { card: number; state: SlotState }[];
  hidden: boolean;
  onHide: () => void;
  onShow: () => void;
}

/** N15, N17: one large card for the next number, a strip with a slot per number, and hide. */
export function HandBlock({ next, slots, hidden, onHide, onShow }: HandBlockProps) {
  const { t } = useTranslation("bai-riang");
  const label = (state: SlotState, card: number) =>
    state === "revealed" ? `${card} ${t("hand.revealed")}` : state === "skipped" ? `${card} ${t("hand.skipped")}` : undefined;

  return (
    <section className="flex min-h-0 grow flex-col gap-2.5 tall:justify-center">
      {hidden ? (
        <button
          type="button"
          onClick={onShow}
          className="flex grow flex-col items-center justify-center gap-2 rounded-[32px] border-2 border-dashed border-line bg-panel text-muted tall:h-[290px] tall:grow-0 tall:rounded-[28px]"
        >
          <Icon name="hide" size={44} />
          <span className="font-display text-2xl font-bold text-text">{t("hand.hidden")}</span>
          <span className="text-base">{t("hand.show")}</span>
        </button>
      ) : (
        <>
          <div className="flex grow items-center justify-center rounded-[32px] bg-signal text-ground tall:h-[220px] tall:grow-0 tall:rounded-[28px]">
            <span className="font-display text-[180px] leading-none font-extrabold tall:text-[140px]">{next ?? "–"}</span>
          </div>
          <ol aria-label={t("hand.label", { count: slots.length })} className="grid grid-cols-3 gap-2.5 tall:gap-2">
            {slots.map((slot) => (
              <HandSlot key={slot.card} card={slot.card} state={slot.state} label={label(slot.state, slot.card)} />
            ))}
          </ol>
        </>
      )}
      <button
        type="button"
        onClick={onHide}
        aria-hidden={hidden}
        tabIndex={hidden ? -1 : 0}
        className={`flex h-11 items-center gap-2 self-center px-4 text-lg font-bold text-muted tall:text-base ${hidden ? "invisible" : ""}`}
      >
        <Icon name="hide" size={20} />
        {t("hand.hide")}
      </button>
    </section>
  );
}
