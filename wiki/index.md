---
ingested_commit: 7e62ca4
---

# PlayHub wiki

How the system works, kept in step with the project by the `update-wiki` skill. Start here, follow a page, then open its sources for detail. Code wins over the wiki.

Layers: sources (code, `specs/`, `docs/adr/`) are read-only truth, these pages are the map, and `CLAUDE.md` holds the rules.

| Page | Read it for | Status |
|---|---|---|
| [Overview](overview.md) | The parts of the system and how they fit | planned |
| [Room lifecycle](room-lifecycle.md) | Create, join, lobby, play, finish, delete | planned |
| [Disconnects and host](disconnects-and-host.md) | Reconnecting, blocking, lost players, host transfer | planned |
| [Game plug-ins](game-plugins.md) | How a game connects to the platform | planned |
| [Realtime and storage](realtime-and-storage.md) | Messages, Durable Object, free-tier limits | planned |
| [Localization](localization.md) | Thai-first text, codes, fonts | planned |
| [Battleship](battleship.md) | Game flow, targeting modes, hidden information | planned |

[Golden set](golden-set.md): questions that test whether this wiki is accurate.
