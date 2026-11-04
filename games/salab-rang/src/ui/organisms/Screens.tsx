import type { PlayerId } from "@playhub/game-contract";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Role } from "../../logic/types";
import { Coin } from "../atoms/Coin";
import { Icon } from "../atoms/Icon";
import { CardFace } from "../molecules/Cards";
import { PRIMARY } from "./styles";

export interface RevealScreenProps {
  role: Role;
  claimed: Role;
  owner: boolean;
  me: string;
  /** Set when this phone moves the game on: use the power or end the turn. */
  action?: { label: string; onClick: () => void; disabled: boolean };
  waitText?: string;
  title: string;
}

/** W36: the phone fills with the card, to hold up to the table. */
export function RevealScreen({ role, claimed, owner, me, action, waitText, title }: RevealScreenProps) {
  const { t } = useTranslation("salab-rang");
  const tone = owner ? "true" : "false";
  return (
    <div className={`sr-fade absolute inset-0 z-20 flex flex-col items-center gap-3.5 px-4 pt-5 pb-4 ${owner ? "bg-sr-true-ground" : "bg-sr-false-ground"}`}>
      <p className="m-0 text-center text-[15px] text-sr-soft">{title}</p>
      <h1 className={`m-0 flex items-center gap-2.5 font-display text-5xl leading-none font-black ${owner ? "text-sr-true" : "text-sr-false"}`}>
        <Icon name={owner ? "check" : "close"} size={44} strokeWidth={3} />
        {owner ? t("reveal.true") : t("reveal.false")}
      </h1>
      <section className="flex min-h-0 grow flex-col items-center justify-center gap-3.5">
        <CardFace
          role={role}
          name={t(`role.${role}.name`)}
          caption={owner ? undefined : t("reveal.claimed", { role: t(`role.${claimed}.name`) })}
          detail={<span className="font-display text-[22px] font-bold">{t("card.of", { name: me })}</span>}
          label={t(`role.${role}.name`)}
          size="xl"
          tone={tone}
        />
        {!owner && (
          <div className="flex flex-wrap justify-center gap-2">
            <Pill tone="false">{t("reveal.fine")}</Pill>
            {role === "dog" && <Pill tone="coin">{t("reveal.dog")}</Pill>}
          </div>
        )}
      </section>
      <p className="m-0 flex items-center gap-2 text-base font-bold text-sr-soft">
        <Icon name="phone" />
        {t("reveal.show")}
      </p>
      {action ? (
        <button type="button" disabled={action.disabled} onClick={action.onClick} className={owner ? PRIMARY.replace("bg-sr-lantern", "bg-sr-true") : PRIMARY}>
          {action.label}
        </button>
      ) : (
        <p className="m-0 flex h-16 w-full items-center justify-center rounded-2xl border-2 border-sr-line font-display text-lg text-sr-soft">{waitText}</p>
      )}
    </div>
  );
}

function Pill({ tone, children }: { tone: "false" | "coin"; children: ReactNode }) {
  return (
    <p className={`m-0 flex h-10 items-center gap-1.5 rounded-full px-4 font-display text-lg font-bold ${tone === "false" ? "bg-sr-false-deep text-sr-false" : "bg-sr-stall text-sr-coin"}`}>
      <Coin size={18} />
      {children}
    </p>
  );
}

/** W22: the gossip's target holds their card up, then turns it over. */
export function ShownScreen({ role, me, onDone, disabled }: { role: Role; me: string; onDone: () => void; disabled: boolean }) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className="sr-fade absolute inset-0 z-20 flex flex-col items-center gap-3.5 bg-sr-raised px-4 pt-5 pb-4">
      <h1 className="m-0 text-center font-display text-[40px] leading-tight font-black text-sr-glow">{t("shown.title")}</h1>
      <section className="flex min-h-0 grow items-center justify-center">
        <CardFace
          role={role}
          name={t(`role.${role}.name`)}
          detail={<span className="font-display text-[22px] font-bold">{t("card.of", { name: me })}</span>}
          label={t(`role.${role}.name`)}
          size="xl"
        />
      </section>
      <p className="m-0 flex items-center gap-2 text-base font-bold text-sr-soft">
        <Icon name="phone" />
        {t("reveal.show")}
      </p>
      <button type="button" disabled={disabled} onClick={onDone} className={PRIMARY}>
        {t("shown.done")}
      </button>
    </div>
  );
}

/** What everyone else sees while another player acts, with the latest public events. */
export function WaitingPanel({ status, latest }: { status: string; latest: string[] }) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className="flex min-h-0 grow flex-col justify-end gap-3">
      <section aria-live="polite" className="flex min-h-[112px] flex-col justify-center gap-1.5 rounded-2xl bg-sr-panel px-4 py-3.5">
        <span className="font-display text-lg font-medium">{status}</span>
        {latest.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm leading-snug text-sr-muted">
            <li className="font-bold text-sr-soft">{t("latest")}</li>
            {latest.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Newly happened public events, shown briefly on every phone. */
export function EventBanner({ lines }: { lines: string[] }) {
  return (
    <div role="status" className="sr-pop pointer-events-none absolute inset-x-6 top-[170px] z-10 flex flex-col gap-1 rounded-2xl border-2 border-sr-lantern bg-sr-stall px-5 py-3.5 shadow-lg tall:inset-x-4 tall:top-[200px]">
      {lines.map((line, i) => (
        <p key={i} className={`m-0 leading-snug ${i === 0 ? "font-display text-lg font-bold text-sr-glow" : "text-[15px] text-sr-text"}`}>
          {line}
        </p>
      ))}
    </div>
  );
}

/** W38: every card moves one seat, and blessed players stay put. */
export function MagicRing({ players, blessed, nameOf, caster }: { players: PlayerId[]; blessed: PlayerId[]; nameOf: (id: PlayerId) => string; caster: string }) {
  const { t } = useTranslation("salab-rang");
  const size = 330;
  const radius = 128;
  return (
    <div role="status" className="sr-fade absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-sr-night/95">
      <h2 className="m-0 font-display text-3xl font-bold">{t("event.power.magician", { player: caster })}</h2>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="sr-spin absolute inset-0 text-sr-lantern" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="3" strokeDasharray="10 10" />
        </svg>
        <span className="absolute top-1/2 left-1/2 flex size-[100px] -translate-1/2 items-center justify-center rounded-full bg-sr-raised text-sr-lantern">
          <Icon name="spin" size={56} />
        </span>
        {players.map((p, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / players.length;
          const still = blessed.includes(p);
          return (
            <span
              key={p}
              className={`absolute flex size-[60px] flex-col items-center justify-center rounded-full text-center text-[13px] leading-tight font-bold ${still ? "border-[3px] border-sr-true bg-sr-true-deep" : "border-2 border-sr-line bg-sr-panel"}`}
              style={{ left: size / 2 + radius * Math.cos(angle) - 30, top: size / 2 + radius * Math.sin(angle) - 30 }}
            >
              <span className="max-w-[52px] truncate">{nameOf(p)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** W41: everyone's final card next to their coins. */
export function FinalCards({ rows, nameOf }: { rows: { id: PlayerId; role: Role | null; coins: number }[]; nameOf: (id: PlayerId) => string }) {
  const { t } = useTranslation("salab-rang");
  return (
    <section className="flex min-h-0 grow flex-col gap-2 pb-20">
      <h2 className="m-0 font-display text-2xl font-bold">{t("final.title")}</h2>
      <ol className="m-0 grid min-h-0 list-none grid-cols-2 gap-1.5 overflow-y-auto p-0 tall:grid-cols-1">
        {rows.map((row) => (
          <li key={row.id} className="flex h-12 items-center gap-2.5 rounded-xl bg-sr-panel px-3.5">
            <span className="w-24 truncate font-bold">{nameOf(row.id)}</span>
            <span className="grow truncate text-sr-soft">{row.role ? t(`role.${row.role}.name`) : ""}</span>
            <span className="flex items-center gap-1 font-display text-lg font-bold">
              <Coin size={14} />
              {row.coins}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
