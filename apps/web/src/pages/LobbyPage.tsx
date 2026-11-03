import type { ClientMessage, PlayerId, RoomSnapshot } from "@playhub/game-contract";
import { Button, HeaderBar, SectionLabel, SplitLayout } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import { games } from "../games";
import { PlayerGrid } from "../organisms/PlayerGrid";
import { RoomCodeCard } from "../organisms/RoomCodeCard";

interface Props {
  snapshot: RoomSnapshot;
  me: PlayerId;
  send: (message: ClientMessage) => void;
  leave: () => void;
}

export function LobbyPage({ snapshot, me, send, leave }: Props) {
  const { t } = useTranslation();
  const game = games[snapshot.gameId];
  const isHost = snapshot.hostId === me;
  const Options = game?.OptionsPanel;

  return (
    <SplitLayout
      header={
        <HeaderBar
          title={t("lobby.title", { game: t("name", { ns: snapshot.gameId }) })}
          action={
            <Button variant="quiet" size="sm" onClick={leave}>
              {t("common.leave")}
            </Button>
          }
        />
      }
      leftClassName="flex h-full flex-col items-center justify-center gap-5 rounded-2xl bg-panel p-8 tall:grid tall:h-auto tall:flex-none tall:grid-cols-[1fr_auto] tall:items-center tall:justify-items-start tall:gap-x-4 tall:gap-y-0 tall:p-4"
      rightClassName="flex h-full min-h-0 flex-col gap-3 tall:grow"
      left={<RoomCodeCard code={snapshot.code} joinUrl={`${location.origin}/join/${snapshot.code}`} />}
      right={
        <>
          <SectionLabel>{t("lobby.players", { count: snapshot.players.length, max: game?.meta.maxPlayers })}</SectionLabel>
          <PlayerGrid
            players={snapshot.players}
            hostId={snapshot.hostId}
            me={me}
            onRemove={isHost ? (playerId) => send({ type: "removeSeat", playerId }) : undefined}
          />
          {Options && <Options options={snapshot.options} editable={isHost} change={(options: unknown) => send({ type: "setOptions", options })} />}
          {isHost ? (
            <Button onClick={() => send({ type: "start" })} className="mt-auto flex-none tall:h-18">
              {t("lobby.start")}
            </Button>
          ) : (
            <p className="mt-auto flex h-20 flex-none items-center justify-center rounded-2xl border-2 border-dashed border-line text-xl text-muted tall:h-18 tall:text-lg">
              {t("lobby.waitHost")}
            </p>
          )}
          <p className="text-center text-base text-muted tall:text-[13px]">{t("lobby.hostHint")}</p>
        </>
      }
    />
  );
}
