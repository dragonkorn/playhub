import { useState } from "react";
import { useTranslation } from "react-i18next";
import { games } from "../games";
import { ApiError, createRoom } from "../repositories/room-api";
import { sessions } from "../repositories/session-repository";
import { navigate } from "./router";
import { input, primary, secondary } from "./ui";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const [gameId] = useState("battleship");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const game = games[gameId];

  const create = async () => {
    setBusy(true);
    try {
      const { code, playerId, token } = await createRoom(gameId, name);
      sessions.saveSession(code, { playerId, token });
      navigate(`/room/${code}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "generic");
      setBusy(false);
    }
  };

  const switchLanguage = () => {
    const next = i18n.language === "th" ? "en" : "th";
    sessions.saveLocale(next);
    void i18n.changeLanguage(next);
  };

  return (
    <main className="grid h-full grid-cols-2 gap-14 p-14">
      <section className="flex flex-col justify-between gap-8">
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-9xl leading-none font-extrabold">
            Play
            <br />
            Hub
          </h1>
          <p className="text-3xl leading-snug text-muted">{t("home.tagline")}</p>
        </div>
        <button type="button" onClick={switchLanguage} className="h-14 w-40 rounded-xl border-2 border-line text-xl font-bold">
          {t("language.switch")}
        </button>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-muted">{t("home.choose")}</h2>
        <div className="flex flex-col gap-2 rounded-2xl border-3 border-signal bg-panel p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-display text-4xl font-bold">{t("name", { ns: gameId })}</h3>
            <span className="text-lg text-muted">{t("home.players", { min: game?.meta.minPlayers, max: game?.meta.maxPlayers })}</span>
          </div>
          <p className="text-lg text-muted">{t("tagline", { ns: gameId })}</p>
        </div>
        <div className="flex items-baseline justify-between gap-4 rounded-2xl border border-line bg-panel p-6">
          <h3 className="font-display text-3xl font-bold text-muted">{t("home.connectFour")}</h3>
          <span className="text-lg text-muted">{t("home.soon")}</span>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-lg font-bold text-muted">
            {t("home.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" className={`${input} h-18 font-normal text-text`} />
          </label>
          {error && <p className="text-lg text-hit">{t(`error.${error}`)}</p>}
          <button type="button" disabled={busy} onClick={create} className={primary}>
            {t("home.create")}
          </button>
          <button type="button" onClick={() => navigate("/join")} className={secondary}>
            {t("home.join")}
          </button>
        </div>
      </section>
    </main>
  );
}
