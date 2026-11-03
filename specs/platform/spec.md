# Platform spec

Status: accepted. Covers everything PlayHub writes once: rooms, lobby, realtime connection, turn blocking, disconnects, host handling, end of game, game plug-ins and localization. Game rules live in `specs/games/<game>/`.

Background and sources: [research/realtime-server.md](../research/realtime-server.md). Decisions: [docs/adr/](../../docs/adr/). Screens: `design/battleship-journey/`.

Requirement IDs are stable. Tests and tasks should cite them.

## 1. Terms

| Term | Meaning |
|---|---|
| Room | One game session, identified by a 4-character code. One Durable Object per room. |
| Seat | A player's place in a room. Created on join, kept across disconnects. |
| Seat token | Secret proving ownership of a seat. Replaces accounts. |
| Host | The seat that can start the game, change options and mark players as lost. |
| Active player | A player whose input the game needs right now, as reported by the game. |
| View | The per-player game data the server sends. Holds only what that player may see. |
| Grace period | Time after a socket closes before the platform treats a player as disconnected for host decisions. |

## 2. Rooms

- **R1** A player creates a room by choosing a game and entering a name. They become host.
- **R2** Room codes are 4 characters from `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, which leaves out characters that look alike. Input is case-insensitive.
- **R3** The server picks a random code. If the room is already in use, it retries with a new code.
- **R4** A player joins by entering the code and a name, or by opening the QR link `/join/<code>`, which fills in the code. The join flow must work in a normal browser tab, because a QR scan on iOS may not open the installed PWA.
- **R5** Joining fails with a coded reason: `room_not_found`, `room_full`, `game_started`, `name_taken`, `name_invalid`.
- **R6** Names are 1 to 16 grapheme clusters, counted with `Intl.Segmenter`, so Thai combining marks don't count as extra characters. The server normalizes to NFC, trims, and rejects control characters. Names are compared case-insensitively within a room.
- **R7** The player count limit comes from the game (`minPlayers`, `maxPlayers`).
- **R8** A room's data is deleted 1 hour after its last activity, using a storage alarm and `deleteAll()`.

## 3. Identity and sessions

- **S1** On create or join, the server issues a random seat token of at least 128 bits and a public `playerId`.
- **S2** The client stores the token per room code through `SessionRepository`. Reopening the app reclaims the seat with no user action.
- **S3** The token never appears in any message except the create or join response, and in the client's own WebSocket URL. It is never included in snapshots, views or logs.
- **S4** If a second socket connects with the same token, the newer socket wins and the older one is closed with `4003 replaced`.
- **S5** A device stores tokens only. There is no profile and no cross-room identity.

## 4. Room lifecycle

```
lobby ──start──► playing ──game outcome done──► finished
  ▲                                                │
  └──────────────────── play again ────────────────┘
any phase ──1 hour inactive──► deleted
```

- **L1** Only the host can start, and only when the seated count is within the game's range and every seat is connected.
- **L2** The host can change game options in the lobby. Everyone sees the current options.
- **L3** Only the host can trigger play again. Connected seats return to the lobby with the same code and options. Seats that are lost or disconnected are removed.
- **L4** A player who leaves in the lobby or at the finished phase loses their seat. A player who leaves during play is marked lost (D6).
- **L5** The host can remove a seat in the lobby. This is needed so a disconnected player can't block L1.
- **L6** The result screen names the winner when one player ranks first, and says it's a draw when several players share first place. A team outcome follows L8 instead.
- **L7** The line above the result comes from the game's catalog, `result.win` or `result.draw`. A game without the key shows no line.
- **L8** A cooperative game ends with `team: "won"` or `team: "lost"` in its outcome, and ranks every player together. The result screen then says the team won or lost, and lists the players without places.
- **L9** A game can supply the result line from its final view through `resultLine`, which returns a message code in the game's catalog. It replaces L7's line.
- **L10** The result screen's board button can be relabeled with `result.boards` in the game's catalog. On the board opened from it, the back button sits at the bottom center, clear of the game's top bar.

## 5. Turns and blocking

- **T1** The platform has no turn logic of its own. The game reports active players through `activePlayers(state)`, which covers both one-at-a-time turns and simultaneous phases such as Battleship setup.
- **T2** The game is blocked when an active player is disconnected. No timer skips a player.
- **T3** Moves from non-active players are rejected with `not_your_turn`.

## 6. Connection status and disconnects

- **D1** Each seat has a connection status, `online` or `reconnecting`, shown to everyone as a dot beside the name: green for online, yellow ring for reconnecting, red for lost.
- **D2** A seat becomes `reconnecting` as soon as its socket closes. It returns to `online` on reconnect and gets a fresh snapshot.
- **D3** The grace period is 30 seconds, run by a storage alarm. It stops an iPad sleep or brief network drop from raising a host decision.
- **D4** When the grace period has passed for a seat and the game is blocked on it, the host sees Wait and Mark as lost. Non-hosts see that the host is deciding.
- **D5** Wait has no server effect, because blocking is already the default. It only dismisses the prompt on the host's device. The host can mark the player as lost later. A seat past its grace period can be marked lost at any time, blocked or not.
- **D6** Mark as lost needs a confirm step on the client. The server then sets the seat to `lost` and calls `removePlayer`, and the game continues. This is permanent.
- **D7** A lost player who returns stays in the room as a watcher. They can't rejoin the game.
- **D8** A player the game has eliminated stays in the room, keeps receiving views, and can't move.

## 7. Host handling

- **H1** Exactly one seat is host while any seat is connected.
- **H2** When the host's grace period passes, the host role moves to the next connected seat in seat order, counting from the old host and wrapping around. Eliminated seats and watchers are eligible.
- **H3** If no seat is connected, no transfer happens. The first seat to reconnect becomes host if the current host is still offline.
- **H4** A returning former host does not get the role back.
- **H5** If the host leaves, transfer happens at once.

## 8. Game plug-in contract

`packages/game-contract` depends on nothing. Each game exposes two entry points: `logic`, which is pure TypeScript with no React, and `ui`.

```ts
export type PlayerId = string;
export type Orientation = "landscape" | "portrait";
export type Locale = "th" | "en";

export interface GameMeta {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  /** Orientations the game screen lays out for (C5, ADR-0007). */
  orientations: readonly Orientation[];
  /** Can be played by everyone on one device (O1). */
  localPlay?: boolean;
}

/** Translatable text. The client renders it, the server never sends sentences. */
export interface Message {
  code: string;
  params?: Record<string, string | number>;
}

export interface GameContext<Options> {
  players: readonly PlayerId[];
  options: Options;
  /** Injected so tests are deterministic. Games must not call Math.random. */
  random: () => number;
}

export type MoveResult<State> =
  | { ok: true; state: State }
  | { ok: false; code: string };

export type Outcome =
  | { done: false }
  /** Best first. Tied players share an inner array. A cooperative game also sets `team` (L8). */
  | { done: true; ranking: PlayerId[][]; team?: "won" | "lost" };

export interface GameDefinition<State, Move, View, Options> {
  meta: GameMeta;
  defaultOptions: Options;
  /** Both parsers take untrusted client input. Return null when invalid. */
  parseOptions(raw: unknown): Options | null;
  parseMove(raw: unknown): Move | null;

  setup(ctx: GameContext<Options>): State;
  applyMove(state: State, player: PlayerId, move: Move, random: () => number): MoveResult<State>;
  activePlayers(state: State): PlayerId[];
  eliminatedPlayers(state: State): PlayerId[];
  /** Applies a platform removal: lost or left. Must keep the game able to finish. */
  removePlayer(state: State, player: PlayerId, random: () => number): State;
  outcome(state: State): Outcome;
  /** viewer is null for a watcher with no seat in the game. */
  viewFor(state: State, viewer: PlayerId | null): View;
}

export interface GameUi<View, Move, Options> {
  meta: GameMeta;
  Board: (props: {
    view: View;
    me: PlayerId;
    players: readonly RoomPlayer[];
    send: (move: Move) => void;
    leave: () => void;
    /** Device storage for this player's unsent work in this room. */
    draft: { load(): unknown; save(value: unknown): void };
    /** Per-device settings that outlive a room. */
    preferences: { load(name: string): unknown; save(name: string, value: unknown): void };
    /** False while this device's own connection is down. */
    online: boolean;
    /** True when the game ended and the platform is waiting for `release`. */
    holding: boolean;
    release: () => void;
    /** True when every seat plays on this device, and `me` is the active seat (O4). */
    local: boolean;
  }) => unknown;
  OptionsPanel?: (props: {
    options: Options;
    editable: boolean;
    change: (options: Options) => void;
  }) => unknown;
  /** One message catalog per locale, namespaced by game id. */
  messages: Record<Locale, Record<string, string>>;
  /** Keep showing the board after the game ends, until it calls `release`. */
  holdsFinish?: boolean;
  /** The result line from the final view, as a code in the game's catalog (L9). */
  resultLine?: (view: View) => Message;
}
```

- **G1** All game functions are pure and synchronous. State is JSON-serializable. Any game log, such as public shot results, lives in state and reaches players through `viewFor`.
- **G2** Adding a game means adding one folder plus one registration line in each of `apps/server` and `apps/web`.
- **G3** The server imports only `logic`. Web imports only `ui`, except the `logic` of local-play games (O3). Enforce this with package exports.
- **G4** `packages/game-contract` ships a test kit that every game must pass: a random playthrough always finishes, state survives a JSON round trip, and no view contains another player's secret data.

The third check needs a game-supplied list of secret values for a given state, so it stays generic.

## 9. Protocol

HTTP, both on the Worker:

| Call | Body | Response |
|---|---|---|
| `POST /rooms` | `{ gameId, name }` | `{ code, playerId, token }` |
| `POST /rooms/:code/join` | `{ name }` | `{ playerId, token }` |

WebSocket: `GET /rooms/:code/ws?token=<token>` on `wss`. An invalid token is refused with `401`.

Client to server, JSON:

```ts
type ClientMessage =
  | { type: "start" }
  | { type: "setOptions"; options: unknown }
  | { type: "move"; version: number; move: unknown }
  | { type: "markLost"; playerId: PlayerId }
  | { type: "removeSeat"; playerId: PlayerId }
  | { type: "playAgain" }
  | { type: "leave" };
```

Server to client, JSON. `RoomPlayer` and these types also live in `packages/game-contract`:

```ts
type ServerMessage =
  | { type: "snapshot"; snapshot: RoomSnapshot }
  | { type: "rejected"; code: string };

interface RoomPlayer {
  id: PlayerId;
  name: string;
  connection: "online" | "reconnecting";
  /** Set by the platform, or derived from the game. */
  status: "seated" | "eliminated" | "lost" | "watching";
  graceExpired: boolean;
}

interface RoomSnapshot {
  version: number;
  code: string;
  gameId: string;
  phase: "lobby" | "playing" | "finished";
  hostId: PlayerId;
  players: RoomPlayer[];
  options: unknown;
  activePlayers: PlayerId[];
  view: unknown | null;
  ranking: PlayerId[][] | null;
  /** Set for a cooperative outcome (L8). */
  team: "won" | "lost" | null;
}
```

- **P1** After any change, each connected player gets a full snapshot built for them. No patches (ADR-0003).
- **P2** `version` increases on every change. A `move` older than the version at which that player became active is rejected with `stale`, so a move queued while offline can't fire on a later turn, while moves sent during unrelated changes still count.
- **P3** All client input is validated: message shape, host rights, phase, then `parseMove` or `parseOptions`.
- **P4** Terminal closes use codes the client won't retry: `4001 room_closed`, `4002 removed`, `4003 replaced`.

## 10. Server design

One Worker serves the web build as static assets and handles the HTTP and WebSocket routes, so everything shares one origin (ADR-0002). The room is written directly on the Durable Object API (ADR-0001).

The room logic is a pure core with a thin Durable Object shell, so it tests without Cloudflare.

```
apps/server/src/
  room/engine.ts        pure: (record, command, now) -> { record, outbox, alarmAt }
  room/room-object.ts   Durable Object shell, the only file using Cloudflare APIs for sockets
  repositories/room-repository.ts
  repositories/durable-object/
  repositories/in-memory/
```

```ts
interface RoomRepository {
  load(): Promise<RoomRecord | null>;
  save(record: RoomRecord): Promise<void>;
  delete(): Promise<void>;
}
```

`RoomRecord` holds seats, token data, phase, options, host, game state and version. It is stored as one row per room, so one change costs one write.

Hibernation is mandatory. Without it, the free tier covers about 37 games a day instead of hundreds.

- **V1** Accept sockets with `ctx.acceptWebSocket()`, never `ws.accept()`.
- **V2** No `setTimeout` or `setInterval` in a room. Use one storage alarm, set to the earliest due time among grace periods and room expiry.
- **V3** Memory is disposable. Each event loads the record. `playerId` is kept in the socket attachment.
- **V4** Heartbeats use `setWebSocketAutoResponse`, so they don't wake the room.
- **V5** The Durable Object migration uses `new_sqlite_classes`, which the free plan requires.
- **V6** When a daily free-tier limit is hit, Cloudflare operations fail until 00:00 UTC. The client shows a translated "server busy" state instead of a broken screen.

## 11. Client design

- **C1** Use `partysocket` for the connection, with a low `maxEnqueuedMessages` and `shouldReconnectOnClose` honoring P4.
- **C2** Use `react-qr-code` for QR, encoding the full join URL.
- **C3** `SessionRepository` wraps `localStorage`, in `apps/web/src/repositories/`, so storage can be swapped and tested.
- **C4** The client trusts snapshots and keeps no game rules. It shows a connection-lost state while its own socket is down.
- **C5** Screens are laid out at a fixed frame and scaled to fit: 1180×820 in landscape, 390×844 in portrait (ADR-0007). Platform screens lay out for both. A game screen uses the viewport's orientation when the game lists it in `orientations`. Otherwise it uses the game's first orientation and shows a translated notice to rotate. Joining is never blocked.
- **C6** After the first visit, playing downloads no app assets. The service worker precaches all build output, including images and sound, and caches fonts on first use. Hashed files under `/assets/` are served `immutable` for one year. HTML and `sw.js` still revalidate, so a new deploy reaches players, and only changed files download.
- **C7** The home page lists every registered game as a card the player can pick. The first registered game is picked by default.

## 12. Localization

- **I1** Thai (`th`) is the default and the source language. English (`en`) is the second locale.
- **I2** All player-facing text comes from message catalogs: platform catalogs in `apps/web`, game catalogs in each game's `ui`.
- **I3** The server sends codes and parameters only, never sentences. Error codes, rejection codes and game logs all follow this.
- **I4** Language choice is per device, kept in `localStorage`, and changed from a control on the main page. Two players in one room can use different languages.
- **I5** Fonts must cover Thai, including the display font. Layouts must fit Thai text, which needs more line height for vowels and tone marks.
- **I6** Player names are shown as entered and never translated.

The library is `react-i18next`.

## 13. Local play

Two or more people can play one game on one device, with no room and no network (ADR-0006).

- **O1** A game opts in with `meta.localPlay: true`. Only a game with no hidden information and one active player at a time may opt in, because everyone shares one screen.
- **O2** On the home page, a local-play game shows a Play on this device button. It asks for one name per seat, `minPlayers` to `maxPlayers`. Names follow R6 and must differ, compared case-insensitively.
- **O3** A local game runs entirely on the device: the web app runs the game's `logic`, and nothing goes over the network. Random comes from `crypto.getRandomValues`, injected as the game's `random`.
- **O4** Seats get the ids `local-1`, `local-2` and so on. The board gets the active player as `me` and `local: true`, so the game names whose turn it is instead of saying "you".
- **O5** A rejected move shows the same translated toast as online play.
- **O6** The game is saved on the device after every move, so a reload resumes it. Leaving deletes it.
- **O7** The end of a local game uses the same result screen. Play again restarts with the same names. There is no lobby, room code, host or disconnect handling.
- **O8** Registering a local-play game takes one more line in `apps/web`, which maps the game id to its `logic`.

## 14. Acceptance criteria

Unless noted, these run in Vitest against `engine.ts` with the in-memory repository and a test game.

1. Host creates a room, 9 others join, and an 11th gets `room_full`. (R5, R7)
2. A Thai name with combining marks of 16 graphemes is accepted, and 17 is rejected. (R6)
3. A snapshot never contains a seat token. (S3)
4. A second socket with the same token closes the first with `4003`. (S4)
5. Start fails for a non-host, below `minPlayers`, and with a disconnected seat. (L1)
6. A move from a non-active player gets `not_your_turn`, and a stale version gets `stale`. (T3, P2)
7. A disconnect sets `reconnecting` immediately, and `graceExpired` only after 30 seconds. (D2, D3)
8. A reconnect before the grace period ends raises no host decision and returns a full snapshot. (D2, D3, P1)
9. A disconnected active player blocks the game, and marking them lost resumes it. (T2, D6)
10. Non-hosts get a rejection for `markLost`. (D4)
11. A lost player who reconnects is a watcher, and their moves are rejected. (D7)
12. Host disconnect transfers the role after the grace period in seat order, and the old host doesn't regain it. (H2, H4)
13. All seats offline, then one returns: that seat becomes host. (H3)
14. Play again keeps connected seats and options, and drops lost seats. (L3)
15. The record reloaded from the repository after any step gives an identical snapshot. (V3)
16. Every registered game passes the test kit. (G4)
17. Manual on `wrangler dev`: a room hibernates, wakes, and serves a reconnecting player their own view. (V1 to V4)
18. Manual on a real iPad: sleep and wake reconnects, and joining from a QR scan works. (R4, D2)
19. A repeat visit gets every app asset and font from the service worker, and `/assets/` files are `immutable`. (C6)
20. The result screen says it's a draw for a tie at the top, and shows the game's `result.win` or `result.draw` line. (L6, L7)
21. The home page lists every game, and creating a room uses the picked one. (C7)
22. A local game starts with valid, distinct names, refuses invalid or repeated ones, and plays a move as the active seat. (O2 to O4)
23. A local game's rejected move returns the game's code and leaves the state alone. (O5)
24. A finished local game ranks like an online one, and play again starts fresh with the same names. (O7)
25. With the network off after the first visit, a whole Four in a Row game plays on one device. (O3, C6)
26. A cooperative outcome reaches the snapshot as `team`, and the result screen says the team won or lost with the game's `resultLine`. (L8, L9)
27. The portrait frame is used in a portrait viewport for platform screens and portrait games, and a landscape-only game stays landscape with the rotate notice. (C5)
28. In e2e on a phone-sized portrait viewport, home, join, lobby, a ใบ้เรียง game and the result screen fit the frame with nothing clipped. (C5)

`pnpm test:e2e` covers real sockets, Durable Object storage and alarms, and the app in headless Chrome. Run it against a local server for UI or protocol changes.
