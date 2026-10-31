import { OptionCard, SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import type { Options } from "../../logic/types";

export interface OptionsPanelProps {
  options: Options;
  editable: boolean;
  change: (options: Options) => void;
}

export function OptionsPanel({ options, editable, change }: OptionsPanelProps) {
  const { t } = useTranslation("battleship");
  return (
    <section className="flex flex-col gap-1">
      <SectionLabel>{t("options.title")}</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {(["free", "robin"] as const).map((targeting) => (
          <OptionCard
            key={targeting}
            title={t(`options.${targeting}`)}
            hint={t(`options.${targeting}Hint`)}
            selected={options.targeting === targeting}
            disabled={!editable}
            onClick={() => change({ targeting })}
          />
        ))}
      </div>
    </section>
  );
}
