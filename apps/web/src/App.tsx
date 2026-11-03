import type { Orientation } from "@playhub/game-contract";
import { NoticeBar } from "@playhub/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BOTH, frameFor } from "./model/frame";
import { useRoute } from "./model/router";
import { ScreenContext, useViewport } from "./model/screen";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { LocalPage } from "./pages/LocalPage";
import { RoomPage } from "./pages/RoomPage";
import { Stage } from "./templates/Stage";

export function App() {
  const { t, i18n } = useTranslation();
  const route = useRoute();
  const viewport = useViewport();
  const [allowed, setAllowed] = useState<readonly Orientation[]>(BOTH);
  const { orientation, rotate } = frameFor(viewport.width, viewport.height, allowed);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <ScreenContext.Provider value={setAllowed}>
      <Stage orientation={orientation} viewport={viewport}>
        {route.page === "home" && <HomePage />}
        {route.page === "join" && <JoinPage code={route.code} />}
        {route.page === "room" && <RoomPage key={route.code} code={route.code} />}
        {route.page === "local" && <LocalPage key={route.gameId} gameId={route.gameId} />}
        {rotate && <NoticeBar position="bottom">{t(`device.rotate.${rotate}`)}</NoticeBar>}
      </Stage>
    </ScreenContext.Provider>
  );
}
