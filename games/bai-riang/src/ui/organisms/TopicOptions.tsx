import { OptionCard } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import type { Options } from "../../logic/types";

/** N1: the host picks who chooses the topic. */
export function TopicOptions({ options, editable, change }: { options: Options; editable: boolean; change: (options: Options) => void }) {
  const { t } = useTranslation("bai-riang");
  return (
    <section className="flex flex-col gap-2">
      <span className="text-lg font-bold text-muted">{t("options.title")}</span>
      <div className="grid grid-cols-2 gap-2 tall:grid-cols-1">
        {(["random", "agreed"] as const).map((topics) => (
          <OptionCard
            key={topics}
            title={t(`options.${topics}`)}
            hint={t(`options.${topics}Hint`)}
            selected={options.topics === topics}
            disabled={!editable}
            onClick={() => change({ topics })}
          />
        ))}
      </div>
    </section>
  );
}
