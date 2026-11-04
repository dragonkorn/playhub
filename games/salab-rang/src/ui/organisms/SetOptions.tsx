import { Button } from "@playhub/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GOALS } from "../../logic/meta";
import { ROLES, type CardSet, type Options, type Role } from "../../logic/types";

const SETS: CardSet[] = ["starter", "chaos", "random", "custom"];

export interface SetOptionsProps {
  options: Options;
  editable: boolean;
  change: (options: Options) => void;
  playerCount: number;
}

/** W1, W40: the coin goal and card set, with a picker for a custom set. */
export function SetOptions({ options, editable, change, playerCount }: SetOptionsProps) {
  const { t } = useTranslation("salab-rang");
  const [picking, setPicking] = useState(false);
  const roles = options.roles;

  const toggle = (role: Role) =>
    change({ ...options, roles: roles.includes(role) ? roles.filter((r) => r !== role) : ROLES.filter((r) => r === role || roles.includes(r)) });

  return (
    <section className="flex flex-col gap-2">
      <span className="text-lg font-bold text-muted tall:text-[15px]">{t("options.set")}</span>
      <div role="radiogroup" aria-label={t("options.set")} className="grid grid-cols-4 gap-2 tall:gap-1.5">
        {SETS.map((set) => (
          <button
            key={set}
            type="button"
            role="radio"
            aria-checked={options.set === set}
            disabled={!editable}
            onClick={() => change({ ...options, set })}
            className={`flex h-20 flex-col items-center justify-center rounded-xl border-2 px-1 tall:h-12 ${options.set === set ? "border-signal bg-signal text-ground" : "border-line bg-panel"}`}
          >
            <span className="text-xl font-bold tall:text-base">{t(`options.${set}`)}</span>
            <span className="text-base tall:hidden">{t(`options.${set}Hint`)}</span>
          </button>
        ))}
      </div>
      {options.set === "custom" && (
        <Button variant="outline" size="sm" className="text-signal" onClick={() => setPicking(true)}>
          {editable ? t("options.edit", { count: roles.length, total: playerCount }) : t("options.view", { count: roles.length })}
        </Button>
      )}
      <span className="text-lg font-bold text-muted tall:text-[15px]">{t("options.goal")}</span>
      <div role="radiogroup" aria-label={t("options.goal")} className="grid grid-cols-3 gap-2">
        {GOALS.map((goal) => (
          <button
            key={goal}
            type="button"
            role="radio"
            aria-checked={options.goal === goal}
            disabled={!editable}
            onClick={() => change({ ...options, goal })}
            className={`h-12 rounded-xl border-2 font-display text-xl font-bold ${options.goal === goal ? "border-signal bg-signal text-ground" : "border-line bg-panel"}`}
          >
            {goal}
          </button>
        ))}
      </div>

      {picking && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ground/85 p-4" onClick={() => setPicking(false)}>
          <section
            role="dialog"
            aria-label={t("options.pickTitle")}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-[640px] flex-col gap-3 rounded-2xl border-2 border-line bg-panel p-6 tall:w-full tall:p-4"
          >
            <header className="flex items-center gap-3">
              <h2 className="m-0 grow font-display text-2xl font-bold">{t("options.pickTitle")}</h2>
              <span className={`font-display text-2xl font-black ${roles.length === playerCount ? "text-online" : "text-signal"}`}>
                {t("options.pickCount", { count: roles.length, total: playerCount })}
              </span>
            </header>
            <p className="m-0 text-base text-muted">{t("options.pickRule", { total: playerCount })}</p>
            <div className="grid min-h-0 grid-cols-2 gap-1.5 overflow-y-auto">
              {ROLES.map((role) => {
                const on = roles.includes(role);
                return (
                  <label key={role} className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 ${on ? "border-signal" : "border-line"}`}>
                    <input type="checkbox" checked={on} disabled={!editable} onChange={() => toggle(role)} className="size-5 flex-none accent-signal" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-display text-base font-bold">{t(`role.${role}.name`)}</span>
                      <span className="text-[13px] leading-snug text-muted">{t(`role.${role}.short`)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Button size="md" onClick={() => setPicking(false)}>
              {t("options.pickDone")}
            </Button>
          </section>
        </div>
      )}
    </section>
  );
}
