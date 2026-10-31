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

- Shared by the platform and a game: `packages/ui`.
- Platform only: `apps/web/src`.
- One game only: `games/<game>/src/ui`.
- Not visual: a `model/` folder, outside the layers.

## Why the rules exist

Below pages, everything renders from props, with no socket or game running (A3). That keeps components testable, and makes Storybook cheap to add later.

`packages/ui/src/atomic-rules.test.ts` fails on any import that breaks a layer, so the structure can't drift.

## Storybook

Planned, not installed. See the [Storybook plan](../specs/platform/storybook-plan.md).
