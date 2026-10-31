import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, joinRoom } from "../repositories/room-api";
import { sessions } from "../repositories/session-repository";
import { navigate } from "./router";
import { input, primary } from "./ui";

export function JoinPage({ code: initialCode }: { code: string }) {
  const { t } = useTranslation();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async () => {
    const room = code.trim().toUpperCase();
    if (sessions.session(room)) return navigate(`/room/${room}`);
    setBusy(true);
    try {
      sessions.saveSession(room, await joinRoom(room, name));
      navigate(`/room/${room}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "generic");
      setBusy(false);
    }
  };

  return (
    <main className="flex h-full flex-col gap-6 px-14 pt-10 pb-14">
      <button type="button" onClick={() => navigate("/")} className="flex min-h-11 items-center self-start text-xl font-medium text-muted">
        {t("common.back")}
      </button>
      <section className="flex w-[560px] flex-col gap-7 self-center">
        <h1 className="text-center font-display text-7xl font-bold">{t("join.title")}</h1>
        <label className="flex flex-col gap-2 text-lg font-bold text-muted">
          {t("join.code")}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            autoComplete="off"
            className={`${input} h-28 border-3 border-signal text-center font-display text-7xl font-bold tracking-[0.25em] text-text`}
          />
        </label>
        <label className="flex flex-col gap-2 text-lg font-bold text-muted">
          {t("home.name")}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="off" className={`${input} h-18 font-normal text-text`} />
        </label>
        {error && <p className="text-center text-lg text-hit">{t(`error.${error}`)}</p>}
        <button type="button" disabled={busy || code.trim().length !== 4} onClick={join} className={primary}>
          {t("join.submit")}
        </button>
        {initialCode && <p className="text-center text-lg text-muted">{t("join.qrHint")}</p>}
      </section>
    </main>
  );
}
