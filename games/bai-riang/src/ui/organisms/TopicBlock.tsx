import { useTranslation } from "react-i18next";
import { Icon } from "../atoms/Icon";

export interface TopicBlockProps {
  /** Topic index, or null for a topic agreed at the table (N1). */
  topic: number | null;
  onReroll?: () => void;
}

export function TopicBlock({ topic, onReroll }: TopicBlockProps) {
  const { t } = useTranslation("bai-riang");
  const part = (name: "title" | "low" | "high") => t(`topic.${topic}.${name}`);
  const title = topic === null ? t("topic.agreed") : part("title");
  const low = topic === null ? t("topic.agreedLow") : part("low");
  const high = topic === null ? t("topic.agreedHigh") : part("high");

  return (
    <section className="flex flex-col justify-center gap-4 tall:gap-3 tall:pt-2">
      <div className="flex h-11 items-center">
        <span className="grow text-lg font-medium text-muted tall:text-sm">{t("topic.label")}</span>
        {onReroll && (
          <button type="button" onClick={onReroll} className="flex h-11 items-center gap-1.5 px-2.5 text-base font-bold text-muted tall:text-sm">
            <Icon name="reroll" size={18} />
            {t("topic.reroll")}
          </button>
        )}
      </div>
      <h2 className="font-display text-6xl leading-tight font-bold tall:text-[32px]">{title}</h2>
      <p className="flex justify-between gap-4 text-xl text-muted tall:text-[15px]">
        <span>
          <b className="font-display text-text">1</b> {low}
        </span>
        <span className="text-right">
          {high} <b className="font-display text-text">100</b>
        </span>
      </p>
    </section>
  );
}
