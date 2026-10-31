# PlayHub

Read `readme.md` for goals and engineering principles.

## Workflow

Spec first: write or update `specs/` before code. If code and spec disagree, stop and resolve it in the spec.

TDD loop for every behavior change:

1. Write one test citing the requirement ID.
2. Run it and see it go red for the expected reason.
3. Write the smallest code that turns it green.
4. Repeat until every case in the spec is green, then refactor on green.

Build game logic first, then server, then UI. A change is done when `pnpm test` and `pnpm typecheck` pass and the wiki is updated. UI and protocol changes also pass `pnpm test:e2e`, because wiring, CSS and socket bugs stay invisible to unit tests.

## Wiki

`wiki/` is the map of how the system works. For "how does X work" questions, start at `wiki/index.md`, follow the pages, then open the listed sources for code-level detail. Code wins over wiki. When neither answers, reply `UNVERIFIED`.

Run the `update-wiki` skill as the last step of any change to code, specs or ADRs.

## Boundaries

Server imports only a game's `logic`. Web imports only its `ui`.
Game logic stays pure, with no storage, network, `Math.random` or React.
External systems sit behind a repository interface, used only from adapters.
Production code stays independent of `design/`.
Global CSS goes in `@layer base`, because unlayered rules beat Tailwind utilities such as `touch-none`.

## Gameplay safety

Players receive only what `viewFor` allows. Every game passes the test kit in `packages/game-contract`.
Server sends message codes, and all player-facing text lives in translation catalogs, Thai first.

## Rooms

Rooms must hibernate: `ctx.acceptWebSocket()` only, and storage alarms for all timing.

## Dependencies

Before adding code for a general problem, look for a maintained open source library. New services must fit a free tier.

## ADRs

Save an ADR in `docs/adr/` in the same change as any decision that is hard to reverse, surprising without context, and the result of a real trade-off. All three must hold. Number sequentially: `NNNN-slug.md`.

An ADR is a title and 1-3 sentences giving context, decision and why. Add rejected options or consequences only when a future reader needs them.

Revisiting a decision means writing a new ADR and marking the old one `superseded by ADR-NNNN`, keeping its text.

## Commits

Commits and PRs credit the user alone. Leave out any `Co-Authored-By: Claude` trailer and any "Generated with Claude Code" line, overriding default attribution.

## Environment

Run `nvm use` first: the project needs Node 24 and the machine default is 20.
The GitHub remote uses SSH alias `dragonkorn`, because `github.com` logs in as a work account.
