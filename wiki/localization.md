---
status: implemented
sources:
  - specs/platform/spec.md
  - apps/web/src/i18n.ts
  - apps/web/src/model/messages.ts
  - apps/web/src/index.css
  - apps/web/src/pages/RoomPage.tsx
  - apps/web/src/pages/ResultPage.tsx
  - packages/game-contract/src/index.ts
  - apps/web/index.html
  - apps/web/vite.config.ts
  - packages/ui/src/theme.css
  - games/bai-riang/src/ui/messages.ts
  - games/bai-riang/src/ui/topics.ts
---

# Localization

Thai is the default and source language, with English second (I1). Language is chosen per device, so one room can mix languages (I4).

## How text travels

The server sends codes and parameters, never sentences (I3). Each device turns a code into text from its own catalog. Platform text lives in `apps/web`, and each game keeps its text in its `ui` (I2). A rejection code is looked up in the game's catalog, then the platform's, then falls back to a generic error.

Player names are shown as typed (I6). Name length counts visible characters, so Thai vowels and tone marks don't use up the limit (R6). The rule lives in `normalizeName` in `packages/game-contract`, shared by the server and [Local play](local-play.md).

The result screen reads its top line from the game's catalog, `result.win` or `result.draw`, so a game words its own ending (L7). A game can instead pick the line's code and parameters from its final view with `resultLine` (L9).

Content can be catalog text too. [ใบ้เรียง](bai-riang.md) keeps its 200 topics in `ui/topics.ts`, Thai and English side by side, and `messages.ts` turns each into `topic.<index>.title`, `.low` and `.high` keys, so the server only sends a topic index.

Fonts must cover Thai, and layouts need room for marks above and below letters (I5). The app uses Kanit and Sarabun, loaded in `apps/web/index.html` and named as tokens in `packages/ui/src/theme.css`.

## Wiring

`apps/web/src/i18n.ts` loads the platform catalog plus one namespace per game, with `react-i18next`. Vite must dedupe `react-i18next`, or a game package gets its own unconfigured copy and shows raw keys such as `options.title`.

Rules: [platform spec](../specs/platform/spec.md), section 12.
