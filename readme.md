# PlayHub
Playhub lets a group of friends start a board game in seconds: one person creates a room, everyone else joins with a short code or QR scan, and the game is played in real time across separate devices — no app store, no sign-up, no install.

The project starts with Battleship and is designed from day one so that new games can be added as plug-ins without touching the platform core.

## Goals

- Instant to start — create a room, share a 4-character code, play. No accounts.
- Built for iPad and phone — touch-first, large tap targets, installable as a PWA so it opens full-screen like an app. Each game declares its target device (iPad or smartphone) and orientation.
- Localized — Thai is the main language, and all player-facing text is translatable, including text inside each game.
- Fair multiplayer — a server acts as referee. Devices only send moves; the server validates them and sends each player only what they are allowed to see. Hidden information (like ship positions) never leaves the server.
- 2+ players — every game declares its own player range; the platform handles lobbies, turn order, and players dropping or rejoining.
- Easy to extend — adding a game means adding one folder that implements a shared GameDefinition contract.
- Low cost — runs entirely on free tiers for small groups.


## Non-goals (for now)
 
- User accounts, profiles, rankings, or matchmaking with strangers
- Native iOS/Android apps
- AI opponents
- Monetization


## How it works
 
```
iPad A ─┐
iPad B ─┼── WebSocket ──► Room "K7Q2" (server) ──► runs game logic
iPad C ─┘                    │
                             └─ sends each player their own view
```
 
- **Platform layer** (written once): game picker, room creation, lobby, realtime connection, turn handling, reconnect, end-of-game screen.
- **Game layer** (one folder per game): rules, board UI, and per-player views.

## Tech stack
 
| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Realtime server | Cloudflare Workers + Durable Objects (one object per room) |
| Hosting | Same Cloudflare Worker, serving static assets |
| Tests | Vitest |
| Install | Progressive Web App (Add to Home Screen) |

## Engineering principles

- **Spec-driven development** — specs are written before code, and code follows the spec.
- **Design mockups stay separate** — mockups live apart from the real project, and production code never imports them.
- **Repository pattern** — platform and game code depend on interfaces, not on external systems directly, so a provider can be replaced by writing a new adapter.
- **Open source first** — use a maintained open source library when one fits, and build from scratch only when none does.
- **Free tier only** — every service must run on its free tier, with no paid plans.
- **Decisions are recorded** — significant decisions are saved as ADRs in `docs/adr/`.
- **Test first** — every behavior starts as a failing test, then code is written until it passes.
- **Living wiki** — `wiki/` explains how the system works and is updated with every change.
- **Atomic design** — UI is built from atoms, molecules, organisms, templates and pages, with shared parts in `packages/ui`.

## Roadmap

### 1. Battleship (first game)

Target device: iPad. Players: 2 to 10. Every player gets a 10×10 board and 5 ships, whatever the player count.

- **Setup phase:** everyone places their fleet at the same time, then taps *Ready*.
- **Battle phase:** on your turn, fire one shot. The host sets the targeting mode for the game: *round robin* (each player shoots the next player in turn order) or *free choice* (choose any opponent's board).
- Everyone sees all shot results, and sunk ships are announced by name.
- A player whose ships are all sunk is eliminated and stays to watch. Last fleet afloat wins.
- If a player disconnects, the host chooses to wait or mark them as lost. If the host disconnects, the host role passes to the next connected player in turn order.

### 2. Four in a Row (second game)

Thai name เรียงสี่. The classic vertical four-in-a-row game, named so to avoid the "Connect Four" trademark. Target device: iPad. Players: exactly 2. Proves the game contract works for more than one game.

- Players take turns dropping a disc into one of 7 columns. Four in a line, in any direction, wins. A full board is a draw.
- Every drop falls and lands with sound, and the winning line lights up.
- **Local play:** two people can also play on one device, with no room and no network.


### 3. ใบ้เรียง (third game)

English name Hint in Order. A cooperative party game. Target devices: phone in portrait, or iPad in landscape. Players: 2 to 10. The app replaces the cards, and players hint at their numbers by talking.

- Each level deals secret numbers from 1 to 100, one per player in level 1, two in level 2, three in level 3. The team shares 3 lives.
- The game picks a topic each level, or the table agrees on one. Players reveal from low to high, in any order, with a 1 second hold.
- Revealing over a lower number skips it and costs a life. Clear all 3 levels to win together.
- Adds phone support to the platform: every screen has a portrait layout.

### 4. สลับร่าง (fourth game)

English name Body Swap. A bluffing party game set at a Thai night market. Target devices: phone in portrait, or iPad in landscape. Players: 4 to 10. Each phone is one face-down character card that players hold up to the table when it is revealed.

- Everyone memorizes all cards at the start, then hides them. On your turn, swap cards with someone (for real or not), peek at your own card, or claim a character to use its power.
- Anyone who thinks they hold the claimed card can challenge. Claimants reveal, the true owner uses the power, and wrong claims pay a fine.
- 13 original characters, from the som tam vendor to the temple dog. The host picks a starter, chaos, random or custom set.
- The market closes when someone reaches the coin goal, or after 4 rounds. Most coins wins.
- Adds a game-defined start check to the platform, and caps names at 10 characters.
