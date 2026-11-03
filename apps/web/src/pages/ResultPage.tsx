import type { ClientMessage, PlayerId, RoomSnapshot } from "@playhub/game-contract";
import { Button, SplitLayout } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import { games } from "../games";
import { resultOf } from "../model/result";
import { RankingList } from "../organisms/RankingList";
import { TeamList } from "../organisms/TeamList";

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
  const { title, line, team } = resultOf(snapshot, games[snapshot.gameId]?.resultLine);
  const heading = title.winner === undefined ? t(title.key) : t(title.key, { name: nameOf(title.winner) });
  const lineText = t(line.key, { ns: snapshot.gameId, defaultValue: "", ...line.params });
  const boards = t("result.boards", { ns: snapshot.gameId, defaultValue: t("result.boards") });

  return (
    <SplitLayout
      centered
      leftClassName="flex flex-col gap-4 tall:gap-1 tall:pt-16"
      rightClassName="flex flex-col gap-2.5 tall:grow"
      left={
        <>
          {lineText && <p className="text-2xl font-bold text-signal tall:text-lg">{lineText}</p>}
          <h1 className="font-display text-8xl leading-none font-extrabold break-words tall:text-6xl">{heading}</h1>
        </>
      }
      right={
        <>
          {team ? <TeamList players={ranking.flat()} me={me} nameOf={nameOf} /> : <RankingList ranking={ranking} me={me} nameOf={nameOf} />}
          {snapshot.hostId === me ? (
            <Button onClick={() => send({ type: "playAgain" })} className="tall:mt-auto tall:h-18">
              {t("result.again")}
            </Button>
          ) : (
            <p className="flex h-20 items-center justify-center rounded-2xl border-2 border-dashed border-line text-xl text-muted tall:mt-auto tall:h-18 tall:text-lg">
              {t("result.waitHost")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="md" onClick={showBoards} className="tall:h-14 tall:text-lg">
              {boards}
            </Button>
            <Button variant="secondary" size="md" onClick={leave} className="tall:h-14 tall:text-lg">
              {t("result.games")}
            </Button>
          </div>
        </>
      }
    />
  );
}
