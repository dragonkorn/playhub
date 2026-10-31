import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { games } from "./games";
import { HomePage } from "./platform/HomePage";
import { JoinPage } from "./platform/JoinPage";
import { RoomPage } from "./platform/RoomPage";
import { useRoute } from "./platform/router";
import { Stage } from "./platform/Stage";

function useDeviceNotice() {
  const check = () => Object.values(games).every((g) => g.meta.orientation === "landscape") && innerHeight > innerWidth;
  const [show, setShow] = useState(check);
  useEffect(() => {
    const update = () => setShow(check());
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);
  return show;
}

export function App() {
  const { t, i18n } = useTranslation();
  const route = useRoute();
  const notice = useDeviceNotice();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <Stage>
      {route.page === "home" && <HomePage />}
      {route.page === "join" && <JoinPage code={route.code} />}
      {route.page === "room" && <RoomPage key={route.code} code={route.code} />}
      {notice && (
        <div className="absolute inset-x-0 bottom-0 bg-panel p-3 text-center text-xl text-muted">{t("device.notice")}</div>
      )}
    </Stage>
  );
}
