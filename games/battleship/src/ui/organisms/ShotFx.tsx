import { useTranslation } from "react-i18next";
import { cellsOf } from "../../logic/fleet";
import type { Placement, Shot } from "../../logic/types";
import { LABEL_X, LABEL_Y } from "./BoardGrid";
import type { Stage } from "../model/playback";

const CELL = 54;
const PITCH = 56;
const DROPS = [[-34, -30], [32, -34], [-40, 6], [40, 8], [-16, -44], [18, -46]];

const at = (row: number, col: number) => ({ left: LABEL_X + col * PITCH, top: LABEL_Y + row * PITCH, width: CELL, height: CELL });

interface Props {
  stage: Stage;
  shot: Shot;
  sunkShip: Placement | undefined;
  targeted: boolean;
}

/** Drawn on top of the board, for one stage of one shot (B32). */
export function ShotFx({ stage, shot, sunkShip, targeted }: Props) {
  const { t } = useTranslation("battleship");

  if (stage === "flight") {
    return (
      <div
        className={`fx-flight pointer-events-none absolute box-border rounded-full border-4 bg-ground/55 ${targeted ? "border-hit" : "border-signal"}`}
        style={at(shot.row, shot.col)}
      />
    );
  }

  if (stage === "miss") {
    return (
      <div className="pointer-events-none absolute" style={at(shot.row, shot.col)}>
        <span className="fx-ripple absolute inset-0 box-border rounded-full border-3 border-text" />
        <span className="fx-ripple-late absolute inset-0 box-border rounded-full border-3 border-muted" />
        {DROPS.map(([x, y]) => (
          <span
            key={`${x},${y}`}
            className="fx-drop absolute top-[23px] left-[23px] h-2 w-2 rounded-full bg-text"
            style={{ "--dx": `${x}px`, "--dy": `${y}px` } as React.CSSProperties}
          />
        ))}
      </div>
    );
  }

  if (stage === "hit" || stage === "sunk") {
    const cells = stage === "sunk" && sunkShip ? cellsOf(sunkShip) : [shot];
    return (
      <>
        <div className="fx-flash pointer-events-none absolute inset-0 bg-[#FFF4D6]" />
        {cells.map((cell, i) => (
          <div key={`${cell.row},${cell.col}`} className="pointer-events-none absolute" style={at(cell.row, cell.col)}>
            <span className="fx-burst absolute inset-0 rounded-full bg-hit" style={{ animationDelay: `${i * 0.14}s` }} />
            <span className="fx-burst-core absolute inset-3 rounded-full bg-signal" style={{ animationDelay: `${i * 0.14}s` }} />
          </div>
        ))}
        {stage === "sunk" && shot.ship && (
          <div className="fx-banner pointer-events-none absolute top-1/2 left-1/2 rounded-2xl border-3 border-hit bg-ground px-7 py-3.5 font-display text-5xl font-extrabold whitespace-nowrap text-hit">
            {t("fx.sunkBanner", { ship: t(`ship.${shot.ship}`) })}
          </div>
        )}
      </>
    );
  }

  return null;
}
