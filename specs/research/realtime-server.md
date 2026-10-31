# Research: realtime server for PlayHub

All sources checked 2026-10-31. Cloudflare "updated" dates are the dates shown on each docs page.
Labels: **[verified]** read in a primary source. **[estimate]** my arithmetic on stated assumptions. **[unverified]** not confirmed; test or check before relying on it.

## Recommendation

**Server: write one `Room` Durable Object directly on the WebSocket Hibernation API, with no server framework. Client: use `partysocket` for reconnection. Do not use boardgame.io as a dependency, but copy its `playerView` idea into `GameDefinition`.**

1. **Do not adopt boardgame.io.** Its server is Koa plus socket.io, and no Cloudflare adapter exists. PlayHub would still write the transport, the storage adapter and the lobby, and would inherit a library that has not reached npm since 2022-11-10. Take the design: moves run on the server, and a per-player view function runs before anything is sent.
2. **Skip PartyServer, narrowly.** It works, but it saves little here and its future is unclear. Its main consumer, the Cloudflare Agents SDK, vendored it and dropped the dependency on 2026-08-21, and `main` has had no commit since 2026-08-03. PlayHub cannot use its `broadcast()`, because every player gets a different view. What remains is routing and hook wiring, which I estimate at about 100 lines on the raw API **[estimate]**.
3. **This is a judgement call.** The readme says "use a maintained open source library when one fits". PartyServer fits, but its maintenance is in doubt. If you would rather use a library, `partyserver@0.5.10` pinned exactly is an acceptable second choice; nothing blocks it. `agents/lifecycle` is the actively maintained successor to the same code. Either way, keep the socket layer behind a repository-pattern adapter, so that swapping costs one file.
4. **Use `partysocket` on the client.** It works with a plain `wss://` URL, needs no PartyServer, and the Agents SDK still depends on it, so it has an active consumer.
5. **The free tier is comfortable if the room hibernates.** A 10-player, 100-shot game uses well under 1% of the daily request limit. The tightest limit is rows written, at roughly 250-500 such games per day. **Hibernation is mandatory:** without it, the 13,000 GB-s daily allowance covers only about 28 room-hours a day.
6. **QR code: `react-qr-code`.** The alternative, `qrcode.react`, is equally workable.

Design rules that follow from this research:

- Accept sockets with `ctx.acceptWebSocket()`, never `ws.accept()`. Standard `accept()` is billed for duration for the whole connection.
- Never use `setTimeout` or `setInterval` in a room, because they block hibernation. Use storage alarms for disconnect grace periods and room expiry.
- Treat memory as disposable. Persist game state in SQLite and keep the player ID in the socket attachment, which is limited to 16,384 bytes.
- Use `setWebSocketAutoResponse` for heartbeats, so they do not wake the room.
- Call `storage.deleteAll()` when a room ends or expires.
- Have the server reject stale moves, and limit the `partysocket` send queue (see section 2).

## 1. boardgame.io

**Runs on Workers/Durable Objects? Not out of the box.**

- No official adapter exists. GitHub issue search for "cloudflare" found only unrelated docs items, an npm search found nothing, and a web search found no adapter. Absence is not proof that no private fork exists. **[verified, as far as these searches go]**
- The server stack is Koa, `@koa/router` and socket.io. The only transport in `src/server/transport` is socket.io. **[verified]**
- There is a possible route: `Master` is exported as `boardgame.io/master` and takes pluggable storage and transport. You would write a client transport, a Durable Object storage adapter and a lobby replacement. **[verified: exports and constructor usage]**
- Whether `Master` bundles and runs cleanly in workerd is **[unverified]**. I did not try it.
- Lobby and match APIs live in the Koa server, so PlayHub would rebuild them. I found no host-transfer feature, but did not audit for one. **[unverified]**

**Maintenance: recently revived, but no release yet.**

| Fact | Value |
|---|---|
| Latest npm release | `0.50.2`, 2022-11-10 (npm `time`). No release in nearly four years |
| `main` package version | Still 0.50.2, with deps modernised (Koa 3, Immer 11, Redux 5) |
| Commits | 2023-24: 23. 2025: none. Jul 2026: 35. Aug 2026: 19. Oct 2026: 1 (2026-10-26, `numPlayers` validation) |
| Open issues / PRs | 54 / 9 |
| Licence / stars | MIT / 12.5k |
| Governance | New maintainers joined through issue #1236, opened 2026-03-11 |
| Release pipeline | On 2026-07-20 and 07-25 maintainers were still asking for help with publishing and considering a fork for early releases |

So the fixes on `main` are not on npm. The community is healthy again but early: one new maintainer writes that they are "still learning about the internals".

**Does `playerView` cover secret state? Yes, well.** **[verified]**

- `getFilterPlayerView` runs on the server per recipient for `patch`, `update` and `sync` payloads.
- It also applies plugin views, clears `_undo`/`_redo`, and strips log args for moves flagged `redact`. Log args are stripped only for flagged moves, so a secret in an unflagged move's args would leak.
- Correctness is the game author's job. `PlayerView.STRIP_SECRETS` only removes a `secret` key and other players' entries under `players`.
- Moves that touch secrets need `client: false`, or the client tries to run them optimistically.

**Fit vs. cost.** It gives good game-state semantics, but the job that takes the most effort on this stack (transport, persistence, lobby, reconnect) is the part it does not provide for Workers. The published package also ships server dependencies PlayHub would not use. Poor fit. The reusable piece is the idea, and a rule engine for 2 games is small.

Sources:
- https://github.com/boardgameio/boardgame.io
- https://www.npmjs.com/package/boardgame.io
- https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/secret-state.md
- https://github.com/boardgameio/boardgame.io/blob/main/src/master/filter-player-view.ts
- https://github.com/boardgameio/boardgame.io/blob/main/src/master/master.ts
- https://github.com/boardgameio/boardgame.io/issues/1236

## 2. PartyServer and partysocket

### PartyServer (`partyserver`)

**What it adds over raw Durable Objects** **[verified: README and source]**

- A `Server` base class with hooks: `onStart` (also runs after wake), `onConnect`, `onMessage`, `onClose`, `onError`, `onRequest`, `onAlarm`.
- URL routing with `routePartykitRequest`, including retries on transient errors (3 attempts by default).
- Connection objects with `id`, `state`/`setState` (about 2 KB, stored in the socket attachment) and tags.
- `getConnections(tag)`, `broadcast()`, and `.name` in all hooks.
- Hibernation behind `static options = { hibernate: true }`.

It does not provide lobby, turn order, per-player views, seat identity, reconnect logic or host transfer. There is also no reliable shutdown hook, because the platform has none.

**Maintenance** **[verified]**

| Fact | Value |
|---|---|
| Latest release | `0.5.10`, 2026-08-03. Pre-1.0 |
| Repo | `cloudflare/partykit`, not archived, last push 2026-08-03. README says "Much like life, this is a Work in Progress" |
| Commits touching the package | 2026: Jan 4, Feb 24, Mar 12, Apr 23, May 2, Jun 7, Jul 2, Aug 4, none since |
| Open issues / PRs | 42 / 2 |
| Licence | ISC |
| Install size | 143 KB unpacked, one dependency (`nanoid`) |

**The key signal.** Agents SDK PR #2133 (merged 2026-08-21) vendored PartyServer into `agents/lifecycle` and removed the dependency. On 2026-10-27 a Cloudflare engineer closed two PartyServer PRs with the comment "closing cause agents sdk no longer depends on partykit."

I found **no deprecation notice**. Maintainers still file issues there (#422, 2026-09-28). Reasonable reading: not abandoned, but no longer actively driven by its main use. That reading is my inference. **[unverified]**

**Fit.** It works, and hibernation and SQLite are compatible with the free plan. It writes a small `__ps_name` record at startup, which is negligible. The usable saving for PlayHub is small, because per-player sends bypass `broadcast()`.

Sources:
- https://github.com/cloudflare/partykit/tree/main/packages/partyserver
- https://www.npmjs.com/package/partyserver
- https://github.com/cloudflare/agents/pull/2133
- https://github.com/cloudflare/partykit/pull/413
- https://github.com/cloudflare/agents/blob/main/packages/agents/src/lifecycle/UPSTREAM.md

### partysocket: usable on its own? Yes.

- The README says it "Works everywhere, not just with PartyKit", and it accepts a plain URL. **[verified]**
- It is a fork of `reconnecting-websocket` with the browser `WebSocket` interface, backoff options, connection timeout and message buffering.
- The URL can be an async function, which suits sending a reconnect token.
- `shouldReconnectOnClose` (added 2026-06-23) can stop retries for terminal closes such as "room ended".
- Package exports include `partysocket/use-ws` and `partysocket/react` for hooks. The plain `WebSocket` hook comes from `use-ws`. **[verified: npm package]**
- Status: `1.3.0`, 2026-06-23, MIT. `agents@0.32.0` (2026-10-29) depends on exactly `partysocket 1.3.0`. React is an optional peer.

Caveats:

- `maxEnqueuedMessages` defaults to unlimited, so a shot tapped while offline is replayed after reconnect. Set a low cap and have the server reject stale moves by state version. Whether `0` fully disables buffering is **[unverified]**.
- The README says "dependency free", but the package depends on `event-target-polyfill` (issue #423, removal requested).
- Issue #422 reports a stale replacement socket in `usePartySocket` when options change twice quickly. Keep options stable.

Sources:
- https://github.com/cloudflare/partykit/tree/main/packages/partysocket
- https://www.npmjs.com/package/partysocket
- https://github.com/cloudflare/partykit/issues/422
- https://github.com/cloudflare/partykit/issues/423

## 3. Other options

| Option | Status | Verdict |
|---|---|---|
| `agents/lifecycle` (Cloudflare Agents SDK) | MIT. `agents@0.32.0`, 2026-10-29, very active. Its docs call `agents/lifecycle` stable. Composes onto a plain `DurableObject` | **Best library fallback.** Maintained PartyServer successor, but it sits in a 10.8 MB AI-focused package with many optional peers. Bundle impact **[unverified]** |
| Rivet (`rivetkit`, `@rivetkit/cloudflare-workers`) | Apache-2.0, 2.3.31, very active. Workers integration uses a wasm runtime | Not for now. Much larger abstraction than one room object needs. Whether it runs within free limits, and whether it needs the Rivet engine, is **[unverified]** |
| Colyseus | MIT, 0.18, active | **Rejected.** Good game-room server, but its deployment docs assume a long-running Node process, and they do not mention Workers. That conflicts with the stack and the free-tier rule |
| `@cloudflare/actors` | `0.0.1-beta.6` | Rejected. Still beta |
| PartyKit classic (`partykit`) | 0.0.115, pinned to 2024 miniflare | Rejected. PartyServer is its Workers-native line |

Sources:
- https://github.com/cloudflare/agents/blob/main/docs/agents/lifecycle.md
- https://github.com/rivet-dev/rivet
- https://docs.colyseus.io/deployment
- https://www.npmjs.com/package/@cloudflare/actors

## 4. Cloudflare free plan

### Limits today **[verified]**

| Item | Workers Free |
|---|---|
| Durable Objects available? | Yes, on Free |
| SQLite backend required? | **Yes.** Only SQLite-backed classes on Free (`new_sqlite_classes` migration) |
| DO requests | 100,000/day |
| DO duration | 13,000 GB-s/day, billed at 128 MB per active object |
| SQL rows read | 5 million/day |
| SQL rows written | 100,000/day |
| Stored data | 5 GB total per account |
| DO classes | 100 |
| Per-object storage | Docs conflict: 10 GB in the table, 1 GB for Free in the FAQ. Irrelevant at PlayHub's size |
| Key + value size | 2 MB |
| WebSocket received message | 32 MiB |
| DO CPU | 30 s per request by default. Whether Free differs is **[unverified]**; game logic is far below it anyway |
| Requests per object | Soft limit 1,000/s |
| Workers requests | 100,000/day, 10 ms CPU per HTTP request |
| Static assets (Pages or Workers) | Free and unlimited |

Over a limit, operations of that type **fail with an error** until the reset at 00:00 UTC. There is no bill, but the client should show a friendly "server busy" state.

### WebSockets and hibernation **[verified]**

- Opening a WebSocket counts as one request.
- Incoming messages are billed at **20:1** (100 messages = 5 requests).
- Outgoing messages and protocol pings are free. Auto-responses are not charged.
- The docs describe the 20:1 ratio as "for compute requests billing-only". Whether it also applies to the Free daily counter is **[unverified]**, so I show a 1:1 worst case below.
- Accepting with `accept()` bills duration for the whole connection. With the Hibernation API, an idle eligible object is not billed, even before it is actually evicted.
- Hibernation happens after about 10 s idle. Memory is lost, the constructor runs again on the next event, and clients stay connected.
- Blockers: pending `setTimeout`/`setInterval`, in-flight requests, and outbound WebSockets.
- A forced code update disconnects sockets, so deploys can trigger reconnects. `partysocket` handles the reconnect; state must already be in storage.

### Estimate: 10 players, 100 shots **[estimate]**

Assumptions:

- 150 incoming messages: 100 shots, 20 for placement and ready, 30 for lobby and host actions.
- 31 connections or HTTP calls: 10 joins, 20 reconnects (iPads sleep), 1 room creation.
- 45-minute game, 50 ms active per event.
- 1 row written per state change, plus a few alarms. About 200 rows, or 400 with a separate shot log.

| Limit | One game | % of daily limit | Games/day to hit limit |
|---|---|---|---|
| DO requests (20:1) | ~39 | 0.04% | ~2,500 |
| DO requests (1:1 worst case) | ~181 | 0.18% | ~550 |
| Worker requests | ~31 | 0.03% | ~3,200 |
| Duration, hibernating | ~1.3 GB-s | 0.01% | ~10,000 |
| Rows written | 200-400 | 0.2-0.4% | **250-500** (tightest) |
| Rows read | ~1,000 | 0.02% | ~5,000 |
| Duration, **not** hibernating | ~346 GB-s | 2.7% | **~37** |

A friend group playing 20 such games a day would use about 4-8% of rows written, and under 4% of everything else.

Storage: at about 100 KB per room (state plus overhead; an empty SQLite database is about 12 KB), 5 GB holds about 50,000 uncleaned rooms. `deleteAll()` at game end keeps it near zero.

**Conclusion:** small friend groups stay well within limits, provided rooms hibernate. Message count is not the risk. A stray `setInterval` is. Keep one row per room snapshot to keep writes low.

Sources:
- https://developers.cloudflare.com/durable-objects/platform/pricing/ (updated 2026-10-18)
- https://developers.cloudflare.com/durable-objects/platform/limits/ (updated 2026-10-29)
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/ (updated 2026-10-30)
- https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
- https://developers.cloudflare.com/durable-objects/api/state/
- https://developers.cloudflare.com/workers/platform/limits/ (updated 2026-10-29)
- https://developers.cloudflare.com/pages/functions/pricing/ (updated 2026-09-08)
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/

**Hosting note.** Durable Objects must live in a Worker either way, so Pages plus a separate Worker works as the readme plans. Cloudflare also publishes a Pages-to-Workers migration guide and describes Workers as having the broader feature set. A single Worker with static assets would give one origin and one deploy, at the same static cost. Worth a look when writing the platform spec; it does not affect this recommendation.
https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/ (updated 2026-10-12)

## 5. QR code and obvious UI needs

### QR code

| Package | Version / date | Licence | Notes |
|---|---|---|---|
| **`react-qr-code`** (pick) | 2.2.0, 2026-06-09 | MIT | Small (20 KB unpacked), recent release, 2 dependencies, sizes via `viewBox`. README implies SVG output; the source was not read **[unverified]** |
| `qrcode.react` | 4.2.0, 2024-12-11 | ISC | No dependencies, SVG and canvas, 4.3k stars, repo has automated dependency updates. Fine too: QR is a stable format, so an old release is low risk |
| `lean-qr` | 2.7.4, 2026-09-07 | MIT | Not a React component in the usual sense; only if bundle size becomes a concern. Not evaluated further |

Encode the full join URL (for example `https://<host>/join/K7Q2`). No in-app scanner is needed, because phone cameras open URLs. On iOS the link probably opens in Safari rather than the installed PWA, so the join flow must work in a normal browser tab **[unverified: test on a device]**.

Sources:
- https://github.com/rosskhanas/react-qr-code
- https://github.com/zpao/qrcode.react
- https://www.npmjs.com/package/lean-qr

### Other UI

- **PWA:** `vite-plugin-pwa` 2.0.0 (2026-10-03, MIT), supports Vite up to 8. Clear need.
- **Ship placement:** start with tap to place and tap to rotate, with no library. If drag is wanted, `@dnd-kit/react` is at 0.5.1 (pre-1.0, released 2026-10-30, MIT) and `@dnd-kit/core` last released in December 2024. Touch behaviour on iPad is **[unverified]**.
- **Animation:** defer. CSS and Tailwind cover hit, miss and sunk effects.

Sources:
- https://github.com/vite-pwa/vite-plugin-pwa
- https://github.com/clauderic/dnd-kit

## Open items to test

1. Prototype one `Room` object on `wrangler dev`: hibernate, wake, restore state, and check that a reconnecting player gets their own view.
2. Check the Cloudflare dashboard's counts during a real game, to settle how 20:1 applies to the Free limit.
3. Test iPad sleep and wake with `partysocket`, and how quickly a dead connection is noticed.
