import { Button, Field, FormLayout, TextInput } from "@playhub/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { clampName } from "../model/name";
import { navigate } from "../model/router";
import { ApiError, joinRoom } from "../repositories/room-api";
import { sessions } from "../repositories/session-repository";

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
    <FormLayout
      title={t("join.title")}
      back={
        <Button variant="quiet" size="sm" onClick={() => navigate("/")}>
          {t("common.back")}
        </Button>
      }
    >
      <Field label={t("join.code")}>
        <TextInput variant="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={4} />
      </Field>
      <Field label={t("home.name")}>
        <TextInput value={name} onChange={(e) => setName(clampName(e.target.value))} />
      </Field>
      {error && <p className="text-center text-lg text-hit">{t(`error.${error}`)}</p>}
      <Button disabled={busy || code.trim().length !== 4} onClick={join}>
        {t("join.submit")}
      </Button>
      {initialCode && <p className="text-center text-lg text-muted">{t("join.qrHint")}</p>}
    </FormLayout>
  );
}
