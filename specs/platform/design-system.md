# Design system spec

Status: accepted. Covers how all UI is structured, on the platform and in every game. Tokens and look come from `design/battleship-journey/`.

## 1. Layers

UI follows atomic design. Every component lives in exactly one layer.

| Layer | Holds | May use |
|---|---|---|
| Atoms | One element: button, input, status dot | Nothing but tokens |
| Molecules | A few atoms doing one job: labeled field, player row | Atoms |
| Organisms | A distinct section: game board, shot log, dialog | Atoms, molecules, organisms, translations |
| Templates | Layout with slots, no content | Atoms, molecules, organisms |
| Pages | A template filled with real data and state | Everything |

- **A1** A component imports only from its own layer or lower.
- **A2** Atoms and molecules take text through props, and never translate.
- **A3** Only pages use hooks that talk to the outside: `use-room`, `use-playback`, sound, repositories. Everything below is driven by props, so it renders alone.
- **A4** Non-visual code lives in `model/`, outside the layers.

## 2. Where things live

| Place | Holds |
|---|---|
| `packages/ui/src/` | Tokens, plus atoms, molecules, organisms and templates shared by the platform and games. Its `model/` holds shared non-visual code, such as the sound player and log playback |
| `apps/web/src/` | Platform organisms, templates and pages |
| `games/<game>/src/ui/` | That game's components |

- **A5** A component used by two or more of those places moves to `packages/ui`.
- **A6** Components use theme tokens, never raw colors. Global CSS stays in `@layer base`.
- **A7** A game imports `@playhub/ui`, and never reaches into the platform.

## 3. Acceptance criteria

1. `atomic-rules.test.ts` fails on any import that breaks A1, A2 or A3.
2. The same test fails on any component outside a layer folder.
3. All end-to-end checks pass after the move, with no change in behavior.
