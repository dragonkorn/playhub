import { Button, SectionLabel } from "@playhub/ui";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import type { Cell } from "../../logic/types";
import { BoardGrid, cellName } from "./BoardGrid";

export interface AimPanelProps {
  fleet: Pick<ComponentProps<typeof BoardGrid>, "ships" | "sunk" | "shots">;
  shipsLeft: number;
  aim: Cell | null;
  onFire: () => void;
}

export function AimPanel({ fleet, shipsLeft, aim, onFire }: AimPanelProps) {
  const { t } = useTranslation("battleship");
  return (
    <>
      <SectionLabel>{t("battle.yourFleet")}</SectionLabel>
      <BoardGrid cell={21} labels={false} {...fleet} />
      <p className="text-base text-muted">{t("battle.shipsLeft", { count: shipsLeft })}</p>
      {aim ? (
        <Button variant="danger" size="xxl" onClick={onFire} className="mt-auto">
          {t("battle.fire", { cell: cellName(aim) })}
        </Button>
      ) : (
        <p className="mt-auto flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-line text-center text-lg text-muted">
          {t("battle.aim")}
        </p>
      )}
    </>
  );
}
