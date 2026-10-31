import { useTranslation } from "react-i18next";

export function EliminatedSplash({ name }: { name: string }) {
  const { t } = useTranslation("battleship");
  return (
    <div className="fx-fade pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ground/90">
      <p className="font-display text-8xl font-extrabold text-hit">{t("fx.eliminated", { name })}</p>
      <p className="text-3xl text-muted">{t("fx.eliminatedBody")}</p>
    </div>
  );
}
