import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { Button, GameLayout, HeaderBar } from "@playhub/ui";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Cell, Move, Placement, ShipId, View } from "../../logic/types";
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
} from "../model/placement";
import { BoardGrid, LABEL_X, LABEL_Y, boardSize } from "../organisms/BoardGrid";
import { ReadyList } from "../organisms/ReadyList";
import { ShipTray } from "../organisms/ShipTray";

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

export function SetupPage({ view, players, send, draft: storage }: Props) {
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
    <GameLayout
      header={<HeaderBar title={t("setup.title")} detail={locked ? t("setup.waiting") : t("setup.subtitle")} />}
      left={<ShipTray selected={selected} locked={locked} onSelect={setSelected} onDragStart={startDrag} />}
      center={
        <>
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
            <div className="mt-1 grid grid-cols-2 gap-3">
              <Button variant="secondary" size="md" disabled={!selected} onClick={() => selected && setDraft(rotateShip(draft, selected))}>
                {t("setup.rotate")}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setDraft(shuffled(Math.random))}>
                {t("setup.shuffle")}
              </Button>
            </div>
          )}
        </>
      }
      right={
        <>
          <ReadyList players={players} ready={view.ready} />
          <Button disabled={locked || !isComplete(draft)} onClick={() => send({ type: "ready", fleet: toFleet(draft) })} className="mt-auto">
            {t("setup.readyButton")}
          </Button>
        </>
      }
    />
  );
}
