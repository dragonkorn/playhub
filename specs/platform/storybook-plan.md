# Storybook plan

Status: plan. Nothing is installed yet.

Storybook shows each component alone, with its states, without running a game. The layer rules make this cheap: everything below pages renders from props (design system spec, A3).

Checked 2026-10-31: `storybook` and `@storybook/react-vite` 10.6.5, MIT, released 2026-10-27. Peer ranges cover Vite 8, React 19 and TypeScript 7.

## Setup

- Install in `packages/ui`, as a dev dependency, using the Vite builder.
- `pnpm storybook` runs it locally, and `pnpm build-storybook` builds it.
- Stories sit beside components: `Button.stories.tsx`.
- Stories load from `packages/ui`, `apps/web` and `games/*/src/ui`, grouped by layer: `Atoms/Button`, `Battleship/Organisms/BoardGrid`.
- A global decorator supplies the theme, fonts and an i18n instance, with a toolbar switch for Thai and English.
- Storybook stays a dev tool, and never ships in the production build.

## Order

1. Atoms and molecules in `packages/ui`, every variant and disabled state.
2. Shared organisms and templates, including `GameLayout` at 1180×820.
3. Battleship: `BoardGrid` with empty, mid-game and sunk fleets, `ShotFx` per stage, `PlayerList` at 10 players.
4. Platform organisms: `DisconnectPanel` for host and non-host, `PlayerGrid`.
5. Pages get stories only where a fixed snapshot is enough.

## Rules to add at step 1

- Every atom, molecule and organism has a story. Add this to `atomic-rules.test.ts`.
- Visual testing: use Storybook's free test runner locally. Chromatic is a paid service, so it is out under the free tier rule unless its free plan proves enough.

## Open question

Hosting a built Storybook for sharing. A separate free Worker would work. Decide when someone other than the developer needs it.
