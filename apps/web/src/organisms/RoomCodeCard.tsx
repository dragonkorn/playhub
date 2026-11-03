import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";

export function RoomCodeCard({ code, joinUrl }: { code: string; joinUrl: string }) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="text-lg font-bold text-muted tall:text-sm">{t("lobby.code")}</h2>
      <p className="font-display text-9xl leading-none font-extrabold tracking-[0.1em] tall:text-5xl">{code}</p>
      <div className="rounded-xl bg-white p-3.5 tall:col-start-2 tall:row-span-3 tall:row-start-1 tall:h-[104px] tall:w-[104px] tall:p-2 [&>svg]:h-full [&>svg]:w-full">
        <QRCode value={joinUrl} size={210} />
      </div>
      <p className="text-lg text-muted tall:text-[13px]">{t("lobby.scan")}</p>
    </>
  );
}
