---
ingested_commit: 2804785
---

# PlayHub wiki

How the system works, kept in step with the project by the `update-wiki` skill. Start here, follow a page, then open its sources for detail. Code wins over the wiki.

Layers: sources (code, `specs/`, `docs/adr/`) are read-only truth, these pages are the map, and `CLAUDE.md` holds the rules.

| Page | Read it for | Status |
|---|---|---|
| [Overview](overview.md) | The parts of the system and how they fit | implemented |
| [Room lifecycle](room-lifecycle.md) | Create, join, lobby, play, finish, delete | implemented |
| [Disconnects and host](disconnects-and-host.md) | Reconnecting, blocking, lost players, host transfer | implemented |
| [Game plug-ins](game-plugins.md) | How a game connects to the platform | implemented |
| [Realtime and storage](realtime-and-storage.md) | Messages, Durable Object, free-tier limits | implemented |
| [Localization](localization.md) | Thai-first text, codes, fonts | implemented |
| [Battleship](battleship.md) | Game flow, placing ships, shot feedback, targeting, hidden information | implemented |
| [Four in a Row](four-in-a-row.md) | Rules, drop log, screen, move feedback | implemented |
| [ใบ้เรียง](bai-riang.md) | Cooperative number ordering, hold to reveal, topics, hidden numbers | implemented |
| [Screens and frames](screens-and-frames.md) | Landscape and portrait frames, and how a screen gets its layout | implemented |
| [Local play](local-play.md) | Playing on one device with no network, and why the browser runs the rules | implemented |
| [Design system](design-system.md) | Atomic layers, shared UI, Storybook plan | implemented |
| [Testing](testing.md) | The three test layers, and what is still unverified | implemented |

[Golden set](golden-set.md): questions that test whether this wiki is accurate.
