import type { ClientMessage, PlayerId, RoomSnapshot } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import { primary, secondary } from "./ui";

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
  const winner = nameOf(ranking[0]?.[0] ?? "");

  return (
    <main className="grid h-full grid-cols-2 items-center gap-14 p-14">
      <section className="flex flex-col gap-4">
        <p className="text-2xl font-bold text-signal">{t("result.last")}</p>
        <h1 className="font-display text-8xl leading-none font-extrabold break-words">{t("result.wins", { name: winner })}</h1>
      </section>
      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg font-bold text-muted">{t("result.order")}</h2>
        <ol className="mb-3 flex flex-col gap-1.5">
          {ranking.flat().map((id, i) => (
            <li key={id} className={`flex h-10 items-center rounded-lg bg-panel px-4 text-lg font-medium ${id === me ? "text-signal" : ""}`}>
              {i + 1}. {nameOf(id)}
            </li>
          ))}
        </ol>
        {snapshot.hostId === me ? (
          <button type="button" onClick={() => send({ type: "playAgain" })} className={primary}>
            {t("result.again")}
          </button>
        ) : (
          <p className="flex h-20 items-center justify-center rounded-2xl border-2 border-dashed border-line text-xl text-muted">
            {t("result.waitHost")}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={showBoards} className={`${secondary} h-16`}>
            {t("result.boards")}
          </button>
          <button type="button" onClick={leave} className={`${secondary} h-16`}>
            {t("result.games")}
          </button>
        </div>
      </section>
    </main>
  );
}
