import type { ClientMessage, PlayerId, RoomSnapshot } from "@playhub/game-contract";
import { Button, SplitLayout } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import { RankingList } from "../organisms/RankingList";

interface Props {
  snapshot: RoomSnapshot;
  me: PlayerId;
  send: (message: ClientMessage) => void;
  leave: () => void;
  showBoards: () => void;
}

export function ResultPage({ snapshot, me, send, leave, showBoards }: Props) {
  const { t } = useTranslation();
  const ranking = snapshot.ranking ?? [];
  const nameOf = (id: PlayerId) => snapshot.players.find((p) => p.id === id)?.name ?? "?";
  const draw = (ranking[0]?.length ?? 0) > 1;
  const title = draw ? t("result.draw") : t("result.wins", { name: nameOf(ranking[0]?.[0] ?? "") });
  const line = t(draw ? "result.draw" : "result.win", { ns: snapshot.gameId, defaultValue: "" });

  return (
    <SplitLayout
      centered
      leftClassName="flex flex-col gap-4"
      rightClassName="flex flex-col gap-2.5"
      left={
        <>
          {line && <p className="text-2xl font-bold text-signal">{line}</p>}
          <h1 className="font-display text-8xl leading-none font-extrabold break-words">{title}</h1>
        </>
      }
      right={
        <>
          <RankingList ranking={ranking} me={me} nameOf={nameOf} />
          {snapshot.hostId === me ? (
            <Button onClick={() => send({ type: "playAgain" })}>{t("result.again")}</Button>
          ) : (
            <p className="flex h-20 items-center justify-center rounded-2xl border-2 border-dashed border-line text-xl text-muted">
              {t("result.waitHost")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="md" onClick={showBoards}>
              {t("result.boards")}
            </Button>
            <Button variant="secondary" size="md" onClick={leave}>
              {t("result.games")}
            </Button>
          </div>
        </>
      }
    />
  );
}
