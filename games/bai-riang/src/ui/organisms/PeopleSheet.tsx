import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { PlayerRow } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import { Icon } from "../atoms/Icon";
import { RevealTile } from "../molecules/RevealTile";
import type { Reveal } from "../../logic/types";

export interface PeopleSheetProps {
  players: readonly RoomPlayer[];
  me: PlayerId;
  left: Record<PlayerId, number>;
  reveals: readonly Reveal[];
  onClose: () => void;
}

/** N18: who is here and what is out, on demand. It covers the screen without moving it. */
export function PeopleSheet({ players, me, left, reveals, onClose }: PeopleSheetProps) {
  const { t } = useTranslation("bai-riang");
  const nameOf = (id: PlayerId) => (id === me ? t("sheet.you") : (players.find((p) => p.id === id)?.name ?? "?"));
  const tiles = reveals.flatMap((r) => [...r.skipped.map((s) => ({ ...s, skipped: true })), { player: r.player, card: r.card, skipped: false }]);

  return (
    <div className="br-fade absolute inset-0 z-10">
      <button type="button" aria-label={t("sheet.close")} onClick={onClose} className="absolute inset-0 bg-ground/70" />
      <section
        role="dialog"
        aria-label={t("sheet.title", { count: players.length })}
        className="br-sheet absolute inset-y-0 right-0 flex w-[440px] flex-col gap-4 overflow-y-auto rounded-l-3xl bg-panel p-6 tall:inset-x-0 tall:top-auto tall:max-h-[85%] tall:w-auto tall:rounded-l-none tall:rounded-t-3xl tall:px-4 tall:pt-3 tall:pb-6"
      >
        <span aria-hidden="true" className="hidden h-1.5 w-10 self-center rounded-full bg-line tall:block" />
        <div className="flex items-center">
          <h2 className="grow font-display text-2xl font-bold">{t("sheet.title", { count: players.length })}</h2>
          <button type="button" aria-label={t("sheet.close")} onClick={onClose} className="flex h-11 w-11 items-center justify-center">
            <Icon name="close" size={22} />
          </button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {players.map((player) => {
            const status = player.status === "lost" ? "lost" : player.connection;
            const away = player.connection === "reconnecting" ? ` · ${t("sheet.away")}` : "";
            const you = player.id === me ? ` · ${t("sheet.you")}` : "";
            return (
              <li key={player.id}>
                <PlayerRow
                  size="sm"
                  name={`${player.name}${you}${away}`}
                  dot={{ status, label: t(`status.${status}`) }}
                  trailing={t("sheet.left", { count: left[player.id] ?? 0 })}
                />
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-muted">{t("sheet.reveals")}</span>
          {tiles.length === 0 ? (
            <p className="flex h-15 items-center justify-center rounded-xl border-2 border-dashed border-line text-base text-muted">{t("sheet.none")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tiles.map((tile) => (
                <RevealTile key={tile.card} card={tile.card} name={nameOf(tile.player)} skipped={tile.skipped} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
