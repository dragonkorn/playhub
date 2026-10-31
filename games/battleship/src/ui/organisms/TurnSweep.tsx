import { useTranslation } from "react-i18next";

export function TurnSweep() {
  const { t } = useTranslation("battleship");
  return (
    <div className="fx-sweep pointer-events-none absolute inset-x-0 top-[330px] flex h-[150px] items-center justify-center bg-signal font-display text-8xl font-extrabold text-ground">
      {t("turn.you")}
    </div>
  );
}
