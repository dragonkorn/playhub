import type { PlayerId } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import type { Role } from "../../logic/types";
import { Icon } from "../atoms/Icon";
import { ActionTile, HoldButton } from "../molecules/Controls";
import { BACK, PRIMARY, SECONDARY } from "./styles";

const PANEL = "flex min-h-0 grow flex-col justify-end gap-3";

/** W9: hold the phone up, then hide for good. */
export function MemorizePanel({ left, onHide, disabled }: { left: number; onHide: () => void; disabled: boolean }) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className={PANEL}>
      <p className="m-0 text-center text-base text-sr-muted">{t("memorize.left", { count: left })}</p>
      <p className="m-0 text-center text-base leading-snug text-sr-soft">
        {t("memorize.hint")}
        <br />
        {t("memorize.warn")}
      </p>
      <button type="button" disabled={disabled} onClick={onHide} className={PRIMARY}>
        <Icon name="hide" size={24} strokeWidth={2.4} />
        {t("memorize.hide")}
      </button>
    </div>
  );
}

/** W11 to W13, W37: the three turn actions. */
export function TurnMenu({ muted, onSwap, onPeek, onClaim, disabled }: { muted: boolean; onSwap: () => void; onPeek: () => void; onClaim: () => void; disabled: boolean }) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className={PANEL}>
      <p className="m-0 self-start rounded-full bg-sr-lantern px-4 py-1.5 font-display text-lg font-bold text-sr-ink tall:self-center">{t("turn.mine")}</p>
      {muted && (
        <p role="status" className="m-0 flex items-center gap-2.5 rounded-xl border-2 border-sr-false bg-sr-false-deep px-3.5 py-3 text-[15px] leading-snug text-sr-text">
          <span className="text-sr-false">
            <Icon name="lock" size={26} strokeWidth={2.2} />
          </span>
          {t("muted.banner")}
        </p>
      )}
      <nav aria-label={t("turn.mine")} className="flex grow flex-col gap-2.5 tall:grid tall:grow-0 tall:grid-cols-3 tall:gap-2">
        <ActionTile icon={<Icon name="swap" size={36} />} title={t("action.swap")} hint={t("action.swapHint")} disabled={disabled} onClick={onSwap} />
        <ActionTile icon={<Icon name="eye" size={36} />} title={t("action.peek")} hint={t("action.peekHint")} disabled={disabled} onClick={onPeek} />
        <ActionTile
          icon={<Icon name={muted ? "lock" : "claim"} size={36} />}
          title={t("action.claim")}
          hint={muted ? t("action.muted") : t("action.claimHint")}
          disabled={disabled || muted}
          onClick={onClaim}
        />
      </nav>
    </div>
  );
}

export interface SwapPanelProps {
  target: PlayerId | null;
  real: boolean;
  nameOf: (id: PlayerId) => string;
  onReal: (real: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
  disabled: boolean;
}

/** W11: pick on the strip, then swap for real or as a bluff. */
export function SwapPanel({ target, real, nameOf, onReal, onConfirm, onBack, disabled }: SwapPanelProps) {
  const { t } = useTranslation("salab-rang");
  const option = (value: boolean, label: string) => (
    <label className={`flex h-[76px] items-center gap-2.5 rounded-xl px-3.5 font-display text-xl font-bold ${real === value ? "border-[3px] border-sr-lantern bg-sr-stall" : "border-2 border-sr-line bg-sr-panel"}`}>
      <input type="radio" name="swap-real" checked={real === value} onChange={() => onReal(value)} className="size-[22px] accent-sr-lantern" />
      {label}
    </label>
  );
  return (
    <div className={PANEL}>
      <button type="button" onClick={onBack} className={BACK}>
        <Icon name="back" />
        {t("back")}
      </button>
      <p className="m-0 text-center text-[15px] text-sr-soft">{t("swap.pick")}</p>
      <fieldset className="m-0 grid grid-cols-2 gap-2 border-0 p-0">
        <legend className="w-full pb-2 text-center text-[15px] text-sr-soft">{t("swap.note")}</legend>
        {option(true, t("swap.real"))}
        {option(false, t("swap.fake"))}
      </fieldset>
      <p className="m-0 text-center text-sm text-sr-muted">{t("swap.after")}</p>
      <button type="button" disabled={disabled || target === null} onClick={onConfirm} className={PRIMARY}>
        {target === null ? t("swap.choose") : t("swap.confirm", { name: nameOf(target) })}
      </button>
    </div>
  );
}

export interface ClaimPanelProps {
  deck: readonly Role[];
  role: Role | null;
  onRole: (role: Role) => void;
  onConfirm: () => void;
  onBack: () => void;
  disabled: boolean;
}

/** W13: claim any character in this game but the dog. */
export function ClaimPanel({ deck, role, onRole, onConfirm, onBack, disabled }: ClaimPanelProps) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className={PANEL}>
      <button type="button" onClick={onBack} className={BACK}>
        <Icon name="back" />
        {t("back")}
      </button>
      <p className="m-0 text-center text-[15px] text-sr-soft">{t("claim.hint", { count: deck.length })}</p>
      <div role="radiogroup" aria-label={t("claim.choose")} className="grid min-h-0 grow auto-rows-fr grid-cols-2 gap-2 overflow-y-auto">
        {deck.map((r) => {
          const dog = r === "dog";
          const on = role === r;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={dog}
              onClick={() => onRole(r)}
              className={`flex min-h-16 flex-col justify-center gap-0.5 rounded-xl px-3 py-2 text-left disabled:opacity-45 ${on ? "border-[3px] border-sr-lantern bg-sr-stall" : "border-2 border-sr-line bg-sr-panel"}`}
            >
              <span className="font-display text-lg leading-tight font-bold">{t(`role.${r}.name`)}</span>
              <span className="text-[13px] leading-snug text-sr-soft">{dog ? t("claim.dog") : t(`role.${r}.short`)}</span>
            </button>
          );
        })}
      </div>
      <button type="button" disabled={disabled || role === null} onClick={onConfirm} className={PRIMARY}>
        <Icon name="claim" size={24} />
        {role === null ? t("claim.choose") : t("claim.confirm", { role: t(`role.${role}.name`) })}
      </button>
    </div>
  );
}

/** W12, W34: hold to look at your own card. */
export function PeekPanel({ onHold, onDone, disabled }: { onHold: (holding: boolean) => void; onDone: () => void; disabled: boolean }) {
  const { t } = useTranslation("salab-rang");
  return (
    <div className={PANEL}>
      <p className="m-0 text-center text-[15px] text-sr-soft">{t("peek.cover")}</p>
      <HoldButton label={t("peek.hold")} holdingLabel={t("peek.holding")} icon={<Icon name="eye" size={24} />} onHoldChange={onHold} />
      <button type="button" disabled={disabled} onClick={onDone} className={SECONDARY}>
        {t("peek.done")}
      </button>
    </div>
  );
}
