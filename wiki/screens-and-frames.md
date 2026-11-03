---
status: implemented
sources:
  - specs/platform/spec.md
  - docs/adr/0007-two-fixed-frames-by-orientation.md
  - apps/web/src/App.tsx
  - apps/web/src/templates/Stage.tsx
  - apps/web/src/model/frame.ts
  - apps/web/src/model/screen.ts
  - packages/ui/src/theme.css
  - packages/ui/src/templates/
---

# Screens and frames

Every screen is laid out at a fixed size, then scaled to fit the device. There are two sizes, picked by the viewport's orientation (C5, [ADR-0007](../docs/adr/0007-two-fixed-frames-by-orientation.md)):

| Frame | Size | Used for |
|---|---|---|
| Landscape | 1180×820 | iPads, and any landscape viewport |
| Portrait | 390×844 | Phones, and an iPad held upright |

Fixed frames keep screens identical to the mockups, at the cost of two layouts per platform screen instead of a fluid one.

## How the frame is picked

`model/frame.ts` decides with `frameFor(width, height, allowed)`. Platform screens, such as home, join, lobby and result, allow both orientations. A game screen allows only the game's `meta.orientations`. If the viewport's orientation isn't allowed, the stage uses the game's first orientation and shows a rotate notice. Battleship and Four in a Row are landscape only, so on a phone held upright they show small, with the notice.

A page declares what it allows with `useScreenOrientations` from `model/screen.ts`. The room and local pages pass the game's orientations while its board is on screen. `App.tsx` reads the viewport and hands the result to `templates/Stage.tsx`, which sets `data-frame` on the frame.

## Writing a portrait layout

`theme.css` defines a `tall:` Tailwind variant that applies inside the portrait frame. A component writes its landscape classes first, then `tall:` overrides. For example, `SplitLayout` stacks its two columns in the portrait frame. The variant follows the frame, not the media query, so a landscape-only game stays in landscape even when the device is upright.

The e2e scenario `baiRiang` checks that home, join, lobby, game and result screens fit the portrait frame with nothing clipped ([Testing](testing.md)).
