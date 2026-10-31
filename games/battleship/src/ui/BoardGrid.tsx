import type { PointerEvent, Ref } from "react";
import { BOARD_SIZE, FLEET, cellsOf } from "../logic/fleet";
import type { Cell, Placement, ShipId, Shot } from "../logic/types";
import { shipArt } from "./art";

export const LABEL_X = 26;
export const LABEL_Y = 22;
const GAP = 2;
const LETTERS = "ABCDEFGHIJ";

export const cellName = ({ row, col }: Cell) => `${LETTERS[row]}${col + 1}`;

export const boardSize = (cell: number, labels: boolean) => ({
  width: BOARD_SIZE * cell + (BOARD_SIZE - 1) * GAP + (labels ? LABEL_X : 0),
  height: BOARD_SIZE * cell + (BOARD_SIZE - 1) * GAP + (labels ? LABEL_Y : 0),
});

interface Props {
  cell: number;
  labels?: boolean;
  ships?: Placement[];
  sunk?: Placement[];
  shots?: Shot[];
  selected?: Cell | null;
  selectedShip?: ShipId | null;
  ghost?: { placement: Placement; valid: boolean } | null;
  /** Unshot cells become buttons when set. */
  onCell?: (cell: Cell) => void;
  onShipDown?: (ship: ShipId, event: PointerEvent) => void;
  boardRef?: Ref<HTMLDivElement>;
}

export function BoardGrid({ cell, labels = true, ships = [], sunk = [], shots = [], selected, selectedShip, ghost, onCell, onShipDown, boardRef }: Props) {
  const offsetX = labels ? LABEL_X : 0;
  const offsetY = labels ? LABEL_Y : 0;
  const pitch = cell + GAP;
  const { width, height } = boardSize(cell, labels);
  const sunkCells = new Set(sunk.flatMap(cellsOf).map((c) => `${c.row},${c.col}`));
  const shotAt = new Map(shots.map((s) => [`${s.row},${s.col}`, s]));
  const radius = cell > 24 ? 6 : 3;

  const placed = (placement: Placement) => {
    const length = FLEET[placement.ship] * cell + (FLEET[placement.ship] - 1) * GAP;
    const vertical = placement.orientation === "vertical";
    return {
      position: "absolute" as const,
      left: offsetX + placement.col * pitch + (vertical ? cell : 0),
      top: offsetY + placement.row * pitch,
      width: length,
      height: cell,
      transform: vertical ? "rotate(90deg)" : undefined,
      transformOrigin: "0 0",
    };
  };

  const rows = Array.from({ length: BOARD_SIZE }, (_, i) => i);

  return (
    <div ref={boardRef} className="relative select-none" style={{ width, height }}>
      {labels &&
        rows.map((i) => (
          <span key={`c${i}`} className="absolute text-center text-xs font-bold text-muted" style={{ left: offsetX + i * pitch, top: 0, width: cell }}>
            {i + 1}
          </span>
        ))}
      {labels &&
        rows.map((i) => (
          <span
            key={`r${i}`}
            className="absolute flex items-center justify-center text-xs font-bold text-muted"
            style={{ left: 0, top: offsetY + i * pitch, width: LABEL_X - GAP, height: cell }}
          >
            {LETTERS[i]}
          </span>
        ))}

      {rows.flatMap((row) =>
        rows.map((col) => {
          const key = `${row},${col}`;
          const taken = shotAt.has(key);
          const isSelected = selected?.row === row && selected.col === col;
          const style = { left: offsetX + col * pitch, top: offsetY + row * pitch, width: cell, height: cell, borderRadius: radius };
          return onCell && !taken ? (
            <button
              key={key}
              type="button"
              aria-label={cellName({ row, col })}
              onClick={() => onCell({ row, col })}
              className={`absolute bg-water ${isSelected ? "outline-3 -outline-offset-3 outline-signal" : ""}`}
              style={style}
            />
          ) : (
            <div key={key} className="absolute bg-water" style={style} />
          );
        }),
      )}

      {ships.map((placement) => {
        const isSunk = sunk.some((s) => s.ship === placement.ship);
        return (
          <img
            key={placement.ship}
            src={shipArt[placement.ship][isSunk ? "sunk" : "intact"]}
            alt=""
            draggable={false}
            onPointerDown={onShipDown ? (event) => onShipDown(placement.ship, event) : undefined}
            className={onShipDown ? "touch-none" : "pointer-events-none"}
            style={{ ...placed(placement), outline: selectedShip === placement.ship ? "3px solid var(--color-signal)" : undefined }}
          />
        );
      })}

      {ghost && (
        <img
          src={shipArt[ghost.placement.ship].intact}
          alt=""
          draggable={false}
          className="pointer-events-none"
          style={{
            ...placed(ghost.placement),
            opacity: 0.85,
            outline: `3px solid ${ghost.valid ? "var(--color-online)" : "var(--color-hit)"}`,
          }}
        />
      )}

      {shots.map((shot) => {
        const key = `${shot.row},${shot.col}`;
        if (shot.result !== "miss" && sunkCells.has(key)) return null;
        return (
          <div
            key={key}
            className="pointer-events-none absolute flex items-center justify-center"
            style={{
              left: offsetX + shot.col * pitch,
              top: offsetY + shot.row * pitch,
              width: cell,
              height: cell,
              borderRadius: radius,
              background: shot.result === "miss" ? undefined : "var(--color-hit)",
            }}
          >
            {shot.result === "miss" ? (
              <span className="rounded-full bg-muted" style={{ width: "26%", height: "26%" }} />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" stroke="var(--color-ground)" strokeWidth="4" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
