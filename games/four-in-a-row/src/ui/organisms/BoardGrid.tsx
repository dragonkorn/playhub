import { useTranslation } from "react-i18next";
import { COLUMNS, ROWS, isFull } from "../../logic/board";
import type { Cell, Drop } from "../../logic/types";
import { Disc, type DiscColor } from "../atoms/Disc";

const PAD = 12;
const INSET = 6;

export interface BoardGridProps {
  cell: number;
  /** Drops that have landed. */
  drops: readonly Drop[];
  colorOf: (player: string) => DiscColor;
  /** The disc falling now, drawn in its cell and animated from the drop row (F18). */
  falling?: { drop: Drop; ms: number } | null;
  /** The disc settling after it lands. */
  landing?: Drop | null;
  line?: readonly Cell[] | null;
  /** Pulse the winning cells, during the win moment. */
  pulse?: boolean;
  selected?: number | null;
  ghost?: DiscColor | null;
  /** Set only when this player may pick a column (F13). */
  onColumn?: (column: number) => void;
}

const same = (a: Cell, b: Cell) => a.row === b.row && a.column === b.column;

export function BoardGrid({ cell, drops, colorOf, falling, landing, line, pulse, selected = null, ghost = null, onColumn }: BoardGridProps) {
  const { t } = useTranslation("four-in-a-row");
  const disc = cell - INSET * 2;
  const left = (column: number) => PAD + column * cell + INSET;
  const top = (row: number) => cell + PAD + (ROWS - 1 - row) * cell + INSET;
  const width = COLUMNS * cell + PAD * 2;
  const columns = Array.from({ length: COLUMNS }, (_, column) => column);

  return (
    <div className="flex flex-col gap-1.5" style={{ width }}>
      <div className="relative" style={{ height: cell + ROWS * cell + PAD * 2 }}>
        <div className="absolute inset-x-0 rounded-2xl bg-water" style={{ top: cell, bottom: 0 }} />
        {columns.flatMap((column) =>
          Array.from({ length: ROWS }, (_, row) => (
            <span
              key={`${row},${column}`}
              className="absolute rounded-full bg-ground"
              style={{ left: left(column), top: top(row), width: disc, height: disc }}
            />
          )),
        )}
        {drops.map((drop) => {
          const won = line?.some((c) => same(c, drop));
          const classes = [won ? "fir-line" : "", won && pulse ? "fir-win" : "", landing && same(landing, drop) ? "fir-land" : ""];
          return (
            <Disc
              key={`${drop.row},${drop.column}`}
              color={colorOf(drop.player)}
              size={disc}
              className={`absolute ${classes.join(" ")}`}
              style={{ left: left(drop.column), top: top(drop.row) }}
            />
          );
        })}
        {falling && (
          <Disc
            color={colorOf(falling.drop.player)}
            size={disc}
            className="fir-fall absolute"
            style={{
              left: left(falling.drop.column),
              top: top(falling.drop.row),
              ["--fall-from" as string]: `${INSET - top(falling.drop.row)}px`,
              ["--fall-ms" as string]: `${falling.ms}ms`,
            }}
          />
        )}
        {ghost !== null && selected !== null && (
          <Disc color={ghost} size={disc} className="absolute opacity-60" style={{ left: left(selected), top: INSET }} />
        )}
        {columns.map((column) => {
          const full = isFull(drops, column);
          return (
            <button
              key={column}
              type="button"
              aria-label={t("board.column", { column: column + 1 })}
              aria-pressed={selected === column}
              disabled={!onColumn || full}
              onClick={() => onColumn?.(column)}
              className={`absolute top-0 bottom-0 rounded-xl disabled:cursor-default ${selected === column ? "bg-text/10" : ""}`}
              style={{ left: PAD + column * cell, width: cell }}
            />
          );
        })}
      </div>
      <div className="flex text-center text-lg font-bold text-muted" style={{ paddingInline: PAD }} aria-hidden>
        {columns.map((column) => (
          <span key={column} style={{ width: cell }}>
            {column + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
