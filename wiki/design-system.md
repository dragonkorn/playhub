---
status: implemented
sources:
  - specs/platform/design-system.md
  - specs/platform/storybook-plan.md
  - packages/ui/
  - docs/adr/0005-atomic-design-with-shared-ui-package.md
---

# Design system

All UI follows atomic design ([ADR-0005](../docs/adr/0005-atomic-design-with-shared-ui-package.md)). Rules are in the [design system spec](../specs/platform/design-system.md).

## Where to put a component

Pick the lowest layer that fits. An atom is one element, a molecule is a few atoms doing one job, an organism is a section of a screen, a template is layout with slots, and a page adds real data.

- Used in two or more of the places below: `packages/ui` (A5).
- Platform only: `apps/web/src`.
- One game only: `games/<game>/src/ui`.
- Not visual: a `model/` folder, outside the layers.

`packages/ui/src/model/` holds non-visual code that both games share: the sound player, which plays named sounds through Web Audio once a tap unlocks audio, and log playback, which plays a game's public log one item at a time and skips what a reconnecting device missed. Each game keeps its own sound names, stages and timing.

Colors and fonts are tokens in `packages/ui/src/theme.css`, and components use those instead of raw values (A6). A game with its own look adds prefixed tokens there, such as the `sr-` night market colors of [สลับร่าง](salab-rang.md). The same file defines the `tall:` variant for the portrait frame ([Screens and frames](screens-and-frames.md)).

## Why the rules exist

Below pages, everything renders from props, with no socket or game running (A3). That keeps components testable, and makes Storybook cheap to add later.

`packages/ui/src/atomic-rules.test.ts` fails on any import that breaks a layer, and on any component outside a layer folder, so the structure can't drift. It finds every folder under `games/` by itself, so a new game is covered with no change to the test.

## Storybook

Planned, not installed. See the [Storybook plan](../specs/platform/storybook-plan.md).
