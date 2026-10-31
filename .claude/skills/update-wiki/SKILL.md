---
name: update-wiki
description: Sync wiki/ with the source of truth. Use after changing code, specs or ADRs, when finishing a feature, or when the wiki is stale or fails lint.
---

The wiki grows with the project, one small ingest per change. Sources (code, `specs/`, `docs/adr/`) are read-only here: this skill edits only `wiki/`.

## Steps

1. Run `node scripts/wiki.mjs changes`. It prints changed files, affected pages, unmapped files, and whether a full ingest is needed.
2. If it says `FULL INGEST`, re-read the sources of every page. Otherwise, take each affected page in turn. Done when every affected page has been checked against its changed sources.
3. Give every unmapped file a home: add it to the `sources` of the right page, or create a page and link it from `wiki/index.md`. Done when a re-run prints no unmapped files.
4. Set `status: implemented` on a page once its behavior exists in code and tests pass. Keep `status: planned` while it exists only in specs.
5. Add one question to `wiki/golden-set.md` for each new behavior, with evidence from a source file. Answers come from sources, never from an earlier LLM answer. Add a question the wiki can't answer whenever a page gains a deliberate gap.
6. Set `ingested_commit` in `wiki/index.md` to the output of `git rev-parse --short HEAD`.
7. Run `node scripts/wiki.mjs lint`. Done when it exits 0.

## Page rules

- A page explains how parts connect and links to where detail lives. Link to a requirement ID or ADR instead of copying its rule, so each fact keeps one source of truth.
- Every claim traces to a file in `sources`. Mark anything you can't trace as `UNVERIFIED`.
- Keep a page under about 60 lines. Split by concept when it grows.
- Write page text for a reader who has never seen the code, including QA.

## Page format

```md
---
status: planned | implemented
sources:
  - specs/platform/spec.md
  - apps/server/src/room/
---

# Title
```

A `sources` entry ending in `/` covers everything under that folder.
