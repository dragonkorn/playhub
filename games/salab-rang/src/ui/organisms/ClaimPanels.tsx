import type { PlayerId } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import type { Role } from "../../logic/types";
import { Icon } from "../atoms/Icon";
import { HoldButton } from "../molecules/Controls";
import { effectiveRole, needOf, type Pick } from "../model/pick";
import { PRIMARY, SECONDARY } from "./styles";

const PANEL = "flex min-h-0 grow flex-col justify-end gap-3";

function ClaimBox({ title, role, count, total }: { title: string; role: Role; count: number; total: number }) {
  const { t } = useTranslation("salab-rang");
  return (
    <section aria-live="polite" className="flex grow flex-col items-center justify-center gap-2.5 rounded-[20px] border-[3px] border-sr-lantern bg-sr-raised p-5 text-center">
      <span className="text-sr-lantern">
        <Icon name="claim" size={40} />
      </span>
      <p className="m-0 font-display text-xl font-medium">{title}</p>
      <p className="m-0 font-display text-[52px] leading-none font-black text-sr-glow">{t(`role.${role}.name`)}</p>
      <p className="m-0 text-[15px] text-sr-soft">{t(`role.${role}.power`)}</p>
      <p className="m-0 mt-2 flex h-8 items-center gap-1.5 rounded-full bg-sr-night px-3.5 text-[15px] font-bold">
        <span className="text-sr-online">
          <Icon name="check" size={16} strokeWidth={3} />
        </span>
        {t("challenge.count", { count, total })}
      </p>
    </section>
  );
}

export interface ChallengePanelProps {
  claimer: string;
  role: Role;
  answered: number;
  total: number;
  myAnswer: boolean | null;
  onAnswer: (challenge: boolean) => void;
  disabled: boolean;
}

/** W14, W15, W35: answer a claim, and change it until everyone has answered. */
export function ChallengePanel({ claimer, role, answered, total, myAnswer, onAnswer, disabled }: ChallengePanelProps) {
  const { t } = useTranslation("salab-rang");
  const button = (challenge: boolean) => {
    const chosen = myAnswer === challenge;
    const lead = myAnswer === null ? challenge : chosen;
    return (
      <button
        type="button"
        aria-pressed={chosen}
        disabled={disabled}
        onClick={() => onAnswer(challenge)}
        className={`flex h-[72px] items-center justify-center gap-2 rounded-2xl font-display text-[22px] font-bold ${lead ? "bg-sr-lantern text-sr-ink" : "border-2 border-sr-me text-sr-text"}`}
      >
        {chosen && <Icon name="check" size={22} strokeWidth={3} />}
        {challenge ? t("challenge.mine") : t("challenge.pass")}
      </button>
    );
  };
  return (
    <div className={PANEL}>
      <ClaimBox title={t("challenge.claim", { name: claimer })} role={role} count={answered} total={total} />
      <p className="m-0 text-center text-sm text-sr-soft">
        {myAnswer === null
          ? t("challenge.hint", { role: t(`role.${role}.name`) })
          : t("challenge.chosen", { answer: myAnswer ? t("challenge.mine") : t("challenge.pass") })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {button(true)}
        {button(false)}
      </div>
    </div>
  );
}

/** W14: the claimer waits for every answer. */
export function ClaimedPanel({ role, answered, total }: { role: Role; answered: number; total: number }) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className={PANEL}>
      <ClaimBox title={t("claimed.title")} role={role} count={answered} total={total} />
      <p className="m-0 text-center text-base text-sr-soft">{t("claimed.wait")}</p>
    </div>
  );
}

export interface PowerPanelProps {
  role: Role;
  deck: readonly Role[];
  pick: Pick;
  nameOf: (id: PlayerId) => string;
  onChannel: (as: Role) => void;
  onUse: () => void;
  onSkip: () => void;
  complete: boolean;
  disabled: boolean;
}

/** W18, W20, W33: pick targets on the strip, then use the power. */
export function PowerPanel({ role, deck, pick, nameOf, onChannel, onUse, onSkip, complete, disabled }: PowerPanelProps) {
  const { t } = useTranslation("salab-rang");
  const target = effectiveRole(pick);
  const channeling = role === "medium" && pick.as === null;
  const need = target ? needOf(target) : "none";
  const instruction =
    need === "one" ? t("power.one") : need === "two" ? t("power.two", { count: pick.targets.length }) : need === "fromTo" ? t("power.fromTo") : t("power.none");
  const sep = need === "fromTo" ? " → " : ", ";

  return (
    <div className={PANEL}>
      <h2 className="m-0 flex items-center justify-center gap-2 font-display text-2xl font-bold">
        {t("power.title", { role: t(`role.${role}.name`) })}
        {role === "medium" && pick.as && <span className="text-sr-glow">→ {t(`role.${pick.as}.name`)}</span>}
      </h2>
      <p className="m-0 text-center text-[15px] leading-snug text-sr-soft">{t(`role.${target ?? role}.power`)}</p>
      {channeling ? (
        <>
          <p className="m-0 text-center text-[15px] text-sr-soft">{t("power.channel")}</p>
          <div role="radiogroup" aria-label={t("power.channel")} className="grid min-h-0 grow auto-rows-fr grid-cols-2 gap-2 overflow-y-auto">
            {deck
              .filter((r) => r !== "medium" && r !== "dog")
              .map((r) => (
                <button key={r} type="button" role="radio" aria-checked={false} onClick={() => onChannel(r)} className="flex min-h-14 flex-col justify-center rounded-xl border-2 border-sr-line bg-sr-panel px-3 py-2 text-left">
                  <span className="font-display text-lg font-bold">{t(`role.${r}.name`)}</span>
                  <span className="text-[13px] text-sr-soft">{t(`role.${r}.short`)}</span>
                </button>
              ))}
          </div>
          <p className="m-0 text-center text-sm text-sr-muted">{t("power.channelOff")}</p>
        </>
      ) : (
        <section className="flex grow flex-col items-center justify-center gap-2 rounded-[20px] bg-sr-raised p-5 text-center">
          <p className="m-0 text-base text-sr-soft">{instruction}</p>
          {pick.targets.length > 0 && <p className="m-0 font-display text-2xl font-bold text-sr-true">{t("power.picked", { names: pick.targets.map(nameOf).join(sep) })}</p>}
          {(target === "seer" || target === "police") && (
            <p className="m-0 flex items-center gap-2 text-sm text-sr-muted">
              <Icon name="lock" size={16} />
              {t("power.private")}
            </p>
          )}
        </section>
      )}
      <button type="button" disabled={disabled || !complete} onClick={onUse} className={PRIMARY}>
        {t("power.use")}
      </button>
      <button type="button" disabled={disabled} onClick={onSkip} className="self-center px-3 py-2 text-[15px] font-bold text-sr-muted">
        {t("power.skip")}
      </button>
    </div>
  );
}

/** W21, W23, W34: a private look, shown only while held. */
export function LookPanel({ title, note, onHold, onDone, doneLabel, disabled }: { title: string; note?: string; onHold: (holding: boolean) => void; onDone: () => void; doneLabel: string; disabled: boolean }) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className={PANEL}>
      <h2 className="m-0 text-center font-display text-2xl font-bold">{title}</h2>
      {note && <p className="m-0 self-center rounded-full bg-sr-true-deep px-4 py-2 font-display text-lg font-bold text-sr-true">{note}</p>}
      <p className="m-0 text-center text-[15px] text-sr-soft">{t("peek.cover")}</p>
      <HoldButton label={t("secret.hold")} holdingLabel={t("secret.holding")} icon={<Icon name="eye" size={24} />} tone="true" onHoldChange={onHold} />
      <button type="button" disabled={disabled} onClick={onDone} className={SECONDARY}>
        {doneLabel}
      </button>
    </div>
  );
}
