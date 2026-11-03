import type { Locale } from "@playhub/game-contract";

export interface Session {
  playerId: string;
  token: string;
}

export interface SessionRepository {
  session(code: string): Session | null;
  saveSession(code: string, session: Session): void;
  removeSession(code: string): void;
  locale(): Locale | null;
  saveLocale(locale: Locale): void;
  draft(code: string): unknown;
  saveDraft(code: string, value: unknown): void;
  preference(name: string): unknown;
  savePreference(name: string, value: unknown): void;
  /** The local game in progress on this device, or null (O6). */
  localGame(): unknown;
  saveLocalGame(value: unknown): void;
}

const read = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage. The game still runs, without resume.
  }
};

export const sessions: SessionRepository = {
  session: (code) => read(`playhub.session.${code}`) as Session | null,
  saveSession: (code, session) => write(`playhub.session.${code}`, session),
  removeSession(code) {
    write(`playhub.session.${code}`, null);
    write(`playhub.draft.${code}`, null);
  },
  locale: () => read("playhub.locale") as Locale | null,
  saveLocale: (locale) => write("playhub.locale", locale),
  draft: (code) => read(`playhub.draft.${code}`),
  saveDraft: (code, value) => write(`playhub.draft.${code}`, value),
  preference: (name) => read(`playhub.pref.${name}`),
  savePreference: (name, value) => write(`playhub.pref.${name}`, value),
  localGame: () => read("playhub.local"),
  saveLocalGame: (value) => write("playhub.local", value),
};
