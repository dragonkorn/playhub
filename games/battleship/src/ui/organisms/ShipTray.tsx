import { SectionLabel } from "@playhub/ui";
import type { PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { SHIP_IDS } from "../../logic/fleet";
import type { ShipId } from "../../logic/types";
import { shipArt } from "../art";
import { ShipTile } from "../molecules/ShipTile";

export interface ShipTrayProps {
  selected: ShipId | null;
  locked: boolean;
  onSelect: (ship: ShipId) => void;
  onDragStart: (ship: ShipId, event: PointerEvent) => void;
}

export function ShipTray({ selected, locked, onSelect, onDragStart }: ShipTrayProps) {
  const { t } = useTranslation("battleship");
  return (
    <>
      <SectionLabel>{t("setup.ships")}</SectionLabel>
      {SHIP_IDS.map((ship) => (
        <ShipTile
          key={ship}
          name={t(`ship.${ship}`)}
          art={shipArt[ship].intact}
          selected={selected === ship}
          disabled={locked}
          onSelect={() => onSelect(ship)}
          onPointerDown={(event) => onDragStart(ship, event)}
        />
      ))}
      {!locked && <p className="text-base text-muted">{t("setup.help")}</p>}
    </>
  );
}
