import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { games } from "./games";
import { messages } from "./model/messages";
import { sessions } from "./repositories/session-repository";

const flat = { keySeparator: false, nsSeparator: false } as const;

const resources = {
  th: { platform: messages.th },
  en: { platform: messages.en },
} as Record<"th" | "en", Record<string, Record<string, string>>>;

for (const [id, game] of Object.entries(games)) {
  resources.th[id] = game.messages.th;
  resources.en[id] = game.messages.en;
}

void i18next.use(initReactI18next).init({
  ...flat,
  resources,
  lng: sessions.locale() ?? "th",
  fallbackLng: "th",
  defaultNS: "platform",
  interpolation: { escapeValue: false },
  initAsync: false,
});

export { i18next };
