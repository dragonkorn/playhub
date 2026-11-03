import { NoticeBar } from "@playhub/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { games } from "./games";
import { useRoute } from "./model/router";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { LocalPage } from "./pages/LocalPage";
import { RoomPage } from "./pages/RoomPage";
import { Stage } from "./templates/Stage";

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
      {route.page === "local" && <LocalPage key={route.gameId} gameId={route.gameId} />}
      {notice && <NoticeBar position="bottom">{t("device.notice")}</NoticeBar>}
    </Stage>
  );
}
