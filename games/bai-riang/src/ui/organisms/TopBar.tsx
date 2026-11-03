import { useTranslation } from "react-i18next";
import { Icon } from "../atoms/Icon";
import { Lives } from "../molecules/Lives";
import { LEVELS, LIVES } from "../../logic/meta";

const BUTTON = "flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-line font-bold tall:h-11 tall:rounded-lg";

export interface TopBarProps {
  /** Left out on the cleared screen, which shows them large. */
  level?: number;
  lives?: number;
  players: number;
  muted: boolean;
  onPeople: () => void;
  onMute: () => void;
}

export function TopBar({ level, lives, players, muted, onPeople, onMute }: TopBarProps) {
  const { t } = useTranslation("bai-riang");
  return (
    <header className="flex h-12 flex-none items-center gap-3 tall:h-11 tall:gap-2">
      {level !== undefined && (
        <h1 className="font-display text-3xl font-bold tall:text-2xl">
          {level}
          <span className="font-medium text-muted">/{LEVELS}</span>
          <span className="sr-only">{t("level", { level })}</span>
        </h1>
      )}
      <div className="flex grow pl-2 tall:pl-1">
        {lives !== undefined && <Lives lives={lives} total={LIVES} label={t("lives", { count: lives })} size={26} />}
      </div>
      <button type="button" aria-label={t("people", { count: players })} onClick={onPeople} className={`${BUTTON} px-3.5 text-lg tall:px-3 tall:text-base`}>
        <Icon name="people" size={22} />
        {players}
      </button>
      <button type="button" aria-label={muted ? t("sound.unmute") : t("sound.mute")} aria-pressed={muted} onClick={onMute} className={`${BUTTON} w-12 tall:w-11`}>
        <Icon name={muted ? "muted" : "sound"} size={22} />
      </button>
    </header>
  );
}
