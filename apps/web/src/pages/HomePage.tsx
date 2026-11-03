import { Button, Field, SectionLabel, SplitLayout, TextInput } from "@playhub/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { games } from "../games";
import { navigate } from "../model/router";
import { GameCard } from "../molecules/GameCard";
import { ApiError, createRoom } from "../repositories/room-api";
import { sessions } from "../repositories/session-repository";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const [gameId, setGameId] = useState(Object.keys(games)[0] ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const players = (min: number, max: number) => (min === max ? t("home.playersExact", { count: min }) : t("home.players", { min, max }));

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
    <SplitLayout
      leftClassName="flex flex-col justify-between gap-8 tall:flex-row tall:items-start tall:gap-4"
      rightClassName="flex flex-col gap-4 tall:min-h-0 tall:grow tall:gap-2.5"
      left={
        <>
          <div className="flex flex-col gap-5 tall:gap-1">
            <h1 className="font-display text-9xl leading-none font-extrabold tall:text-5xl">
              Play
              <br className="tall:hidden" />
              Hub
            </h1>
            <p className="text-3xl leading-snug text-muted tall:text-base">{t("home.tagline")}</p>
          </div>
          <Button variant="secondary" size="md" onClick={switchLanguage} className="w-40 tall:h-11 tall:w-auto tall:flex-none tall:text-base">
            {t("language.switch")}
          </Button>
        </>
      }
      right={
        <>
          <SectionLabel>{t("home.choose")}</SectionLabel>
          {Object.entries(games).map(([id, game]) => (
            <GameCard
              key={id}
              title={t("name", { ns: id })}
              meta={players(game.meta.minPlayers, game.meta.maxPlayers)}
              description={t("tagline", { ns: id })}
              selected={id === gameId}
              onClick={() => setGameId(id)}
            />
          ))}
          <div className="mt-auto flex flex-col gap-3 tall:gap-2.5">
            <Field label={t("home.name")}>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </Field>
            {error && <p className="text-lg text-hit">{t(`error.${error}`)}</p>}
            <Button disabled={busy} onClick={create} className="tall:h-16">
              {t("home.create")}
            </Button>
            <div className={`grid gap-3 ${games[gameId]?.meta.localPlay ? "grid-cols-2" : ""}`}>
              <Button variant="secondary" size="lg" onClick={() => navigate("/join")}>
                {t("home.join")}
              </Button>
              {games[gameId]?.meta.localPlay && (
                <Button variant="secondary" size="lg" onClick={() => navigate(`/local/${gameId}`)}>
                  {t("home.local")}
                </Button>
              )}
            </div>
          </div>
        </>
      }
    />
  );
}
