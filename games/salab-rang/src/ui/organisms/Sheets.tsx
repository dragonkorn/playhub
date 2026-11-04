import type { PlayerId } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import type { Event, Role } from "../../logic/types";
import { eventLines } from "../model/board";
import { SheetFrame } from "../molecules/Controls";
import { useLineText } from "./useLineText";

/** W39: public history, newest first. */
export function LogSheet({ log, nameOf, onClose }: { log: readonly Event[]; nameOf: (id: PlayerId) => string; onClose: () => void }) {
  const { t } = useTranslation("salab-rang");
  const text = useLineText(nameOf);
  const lines = eventLines(log);
  return (
    <SheetFrame title={t("history")} hint={t("log.hint")} closeLabel={t("close")} onClose={onClose}>
      {lines.length === 0 && <p className="text-sr-muted">{t("log.empty")}</p>}
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {lines.map((line, i) => (
          <li key={lines.length - i} className={`rounded-xl px-3.5 py-2.5 leading-snug ${line.key === "event.coins" ? "bg-transparent text-sm text-sr-soft" : "bg-sr-night text-base font-bold"}`}>
            {text(line)}
          </li>
        ))}
      </ol>
    </SheetFrame>
  );
}

/** W39: the characters in this game. */
export function GuideSheet({ deck, onClose }: { deck: readonly Role[]; onClose: () => void }) {
  const { t } = useTranslation("salab-rang");
  return (
    <SheetFrame title={t("guide.title")} closeLabel={t("close")} onClose={onClose}>
      <p className="m-0 rounded-xl bg-sr-stall px-3 py-2.5 text-sm leading-snug text-sr-glow">{t("guide.rule")}</p>
      <dl className="m-0 flex flex-col gap-1.5">
        {deck.map((role) => (
          <div key={role} className="flex flex-col gap-px rounded-xl bg-sr-night px-3 py-2">
            <dt className="font-display text-[17px] font-bold text-sr-glow">{t(`role.${role}.name`)}</dt>
            <dd className="m-0 text-sm leading-snug">{t(`role.${role}.power`)}</dd>
          </div>
        ))}
      </dl>
    </SheetFrame>
  );
}
