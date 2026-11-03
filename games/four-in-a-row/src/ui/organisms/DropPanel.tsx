import { Button } from "@playhub/ui";
import { useTranslation } from "react-i18next";

export function DropPanel({ selected, onDrop }: { selected: number | null; onDrop: () => void }) {
  const { t } = useTranslation("four-in-a-row");
  return selected !== null ? (
    <Button size="xxl" onClick={onDrop} className="mt-auto">
      {t("drop.button", { column: selected + 1 })}
    </Button>
  ) : (
    <p className="mt-auto flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-line text-center text-lg text-muted">
      {t("drop.hint")}
    </p>
  );
}
