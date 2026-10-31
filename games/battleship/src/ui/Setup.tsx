import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { SHIP_IDS } from "../logic/fleet";
import type { Cell, Move, Placement, ShipId, View } from "../logic/types";
import { BoardGrid, LABEL_X, LABEL_Y, boardSize } from "./BoardGrid";
import { shipArt } from "./art";
import {
  canPlace,
  cellFromPoint,
  isComplete,
  parseDraft,
  placeShip,
  rotateShip,
  shipLength,
  shuffled,
  toFleet,
  type Draft,
} from "./placement";

const CELL = 54;
const DRAG_THRESHOLD = 8;
/** Lifts the dragged ship above the finger (B27). */
const FINGER_OFFSET = 70;

interface Drag {
  ship: ShipId;
  moved: boolean;
  ghost: { placement: Placement; valid: boolean } | null;
}

interface Props {
  view: View;
  me: PlayerId;
  players: readonly RoomPlayer[];
  send: (move: Move) => void;
  draft: { load(): unknown; save(value: unknown): void };
}

export function Setup({ view, me, players, send, draft: storage }: Props) {
  const { t } = useTranslation("battleship");
  const [draft, setDraft] = useState<Draft>(() => parseDraft(storage.load()));
  const [selected, setSelected] = useState<ShipId | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const locked = view.myFleet !== null;

  /** The ref is what pointer listeners read, so a fast release never sees stale state. */
  const updateDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  useEffect(() => storage.save(draft), [draft, storage]);

  const orientationOf = (ship: ShipId) => draft[ship]?.orientation ?? "horizontal";

  /** Screen geometry of the board, which the stage may have scaled. */
  function geometry() {
    const rect = board.current?.getBoundingClientRect();
    if (!rect) return null;
    const scale = rect.width / boardSize(CELL, true).width;
    return {
      scale,
      left: rect.left,
      top: rect.top,
      pitch: (CELL + 2) * scale,
      labelX: LABEL_X * scale,
      labelY: LABEL_Y * scale,
    };
  }

  function ghostAt(ship: ShipId, x: number, y: number) {
    const box = geometry();
    if (!box) return null;
    const orientation = orientationOf(ship);
    const point = { x, y: y - FINGER_OFFSET * box.scale };
    const cell = cellFromPoint(point, shipLength(ship), orientation, box);
    const placement: Placement = { ship, ...cell, orientation };
    return { placement, valid: canPlace(draft, placement) };
  }

  function startDrag(ship: ShipId, event: PointerEvent) {
    if (locked) return;
    event.preventDefault();
    const { pointerId, clientX, clientY } = event;
    updateDrag({ ship, moved: false, ghost: null });

    const move = (e: globalThis.PointerEvent) => {
      const current = dragRef.current;
      if (!current || e.pointerId !== pointerId) return;
      const moved = current.moved || Math.hypot(e.clientX - clientX, e.clientY - clientY) > DRAG_THRESHOLD;
      updateDrag({ ...current, moved, ghost: moved ? ghostAt(ship, e.clientX, e.clientY) : null });
    };
    const end = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      const ghost = dragRef.current?.ghost;
      if (ghost?.valid) setDraft((d) => placeShip(d, ghost.placement));
      setSelected(ship);
      updateDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  const placeSelected = (cell: Cell) => {
    if (selected) setDraft(placeShip(draft, { ship: selected, ...cell, orientation: orientationOf(selected) }));
  };

  const ships = locked ? (view.myFleet ?? []) : toFleet(draft);

  return (
    <main className="flex h-full flex-col gap-4 p-6">
      <header className="flex h-16 items-center justify-between gap-6">
        <h1 className="font-display text-4xl font-bold">{t("setup.title")}</h1>
        <p className="text-lg text-muted">{locked ? t("setup.waiting") : t("setup.subtitle")}</p>
      </header>
      <div className="grid min-h-0 grow grid-cols-[250px_584px_250px] justify-between">
        <section className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold text-muted">{t("setup.ships")}</h2>
          {SHIP_IDS.map((ship) => (
            <button
              key={ship}
              type="button"
              disabled={locked}
              onClick={() => setSelected(ship)}
              onPointerDown={(event) => startDrag(ship, event)}
              aria-pressed={selected === ship}
              className={`flex min-h-20 touch-none flex-col justify-center gap-1 rounded-xl border-2 bg-panel p-3 text-left ${selected === ship ? "border-signal" : "border-transparent"}`}
            >
              <span className="text-lg font-medium">{t(`ship.${ship}`)}</span>
              <img src={shipArt[ship].intact} alt="" draggable={false} className="pointer-events-none h-6 self-start" />
            </button>
          ))}
          {!locked && <p className="text-base text-muted">{t("setup.help")}</p>}
        </section>

        <section className="flex flex-col gap-4">
          <BoardGrid
            boardRef={board}
            cell={CELL}
            ships={ships.filter((p) => !(drag?.moved && p.ship === drag.ship))}
            ghost={drag?.ghost}
            selectedShip={locked ? null : selected}
            onCell={locked ? undefined : placeSelected}
            onShipDown={locked ? undefined : startDrag}
          />
          {!locked && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!selected}
                onClick={() => selected && setDraft(rotateShip(draft, selected))}
                className="h-16 rounded-xl border-2 border-line bg-panel text-xl font-bold disabled:text-muted"
              >
                {t("setup.rotate")}
              </button>
              <button
                type="button"
                onClick={() => setDraft(shuffled(Math.random))}
                className="h-16 rounded-xl border-2 border-line bg-panel text-xl font-bold"
              >
                {t("setup.shuffle")}
              </button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="mb-1 text-lg font-bold text-muted">{t("setup.players")}</h2>
          {players
            .filter((p) => p.status !== "lost")
            .map((p) => (
              <div key={p.id} className="flex h-11 items-center justify-between rounded-lg bg-panel px-3.5 text-lg">
                <span className="truncate font-medium">{p.name}</span>
                <span className="text-base text-muted">{view.ready.includes(p.id) ? t("setup.ready") : t("setup.placing")}</span>
              </div>
            ))}
          <button
            type="button"
            disabled={locked || !isComplete(draft)}
            onClick={() => send({ type: "ready", fleet: toFleet(draft) })}
            className="mt-auto h-20 rounded-2xl bg-signal text-2xl font-bold text-ground disabled:bg-panel disabled:text-muted"
          >
            {t("setup.readyButton")}
          </button>
        </section>
      </div>
    </main>
  );
}
