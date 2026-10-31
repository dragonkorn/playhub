import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";

export function RoomCodeCard({ code, joinUrl }: { code: string; joinUrl: string }) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="text-lg font-bold text-muted">{t("lobby.code")}</h2>
      <p className="font-display text-9xl leading-none font-extrabold tracking-[0.1em]">{code}</p>
      <div className="rounded-xl bg-white p-3.5">
        <QRCode value={joinUrl} size={210} />
      </div>
      <p className="text-lg text-muted">{t("lobby.scan")}</p>
    </>
  );
}
