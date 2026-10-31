---
status: implemented
sources:
  - specs/platform/spec.md
  - apps/web/src/i18n.ts
  - apps/web/src/platform/messages.ts
  - apps/web/src/index.css
  - apps/web/vite.config.ts
---

# Localization

Thai is the default and source language, with English second (I1). Language is chosen per device, so one room can mix languages (I4).

## How text travels

The server sends codes and parameters, never sentences (I3). Each device turns a code into text from its own catalog. Platform text lives in `apps/web`, and each game keeps its text in its `ui` (I2).

Player names are shown as typed (I6). Name length counts visible characters, so Thai vowels and tone marks don't use up the limit (R6).

Fonts must cover Thai, and layouts need room for marks above and below letters (I5). The app uses Kanit and Sarabun.

## Wiring

`apps/web/src/i18n.ts` loads the platform catalog plus one namespace per game, with `react-i18next`. Vite must dedupe `react-i18next`, or a game package gets its own unconfigured copy and shows raw keys such as `options.title`.

Rules: [platform spec](../specs/platform/spec.md), section 12.
