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
    <SplitLayout
      leftClassName="flex flex-col justify-between gap-8"
      rightClassName="flex flex-col gap-4"
      left={
        <>
          <div className="flex flex-col gap-5">
            <h1 className="font-display text-9xl leading-none font-extrabold">
              Play
              <br />
              Hub
            </h1>
            <p className="text-3xl leading-snug text-muted">{t("home.tagline")}</p>
          </div>
          <Button variant="secondary" size="md" onClick={switchLanguage} className="w-40">
            {t("language.switch")}
          </Button>
        </>
      }
      right={
        <>
          <SectionLabel>{t("home.choose")}</SectionLabel>
          <GameCard
            title={t("name", { ns: gameId })}
            meta={t("home.players", { min: game?.meta.minPlayers, max: game?.meta.maxPlayers })}
            description={t("tagline", { ns: gameId })}
          />
          <div className="mt-auto flex flex-col gap-3">
            <Field label={t("home.name")}>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </Field>
            {error && <p className="text-lg text-hit">{t(`error.${error}`)}</p>}
            <Button disabled={busy} onClick={create}>
              {t("home.create")}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate("/join")}>
              {t("home.join")}
            </Button>
          </div>
        </>
      }
    />
  );
}
