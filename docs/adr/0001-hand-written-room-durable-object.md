# Hand-written Room Durable Object, no room framework

PlayHub's rule is open source first, but the room server is written directly on the Durable Object WebSocket Hibernation API. Every player gets a different view, so library `broadcast()` helpers don't apply, and the remaining gain is about 100 lines of routing.

## Considered Options

- **boardgame.io:** no Workers adapter, server is Koa and socket.io, no npm release since 2022. We keep its `playerView` idea as `viewFor` in `GameDefinition`.
- **PartyServer:** works, but is pre-1.0 and the Cloudflare Agents SDK dropped it in 2026-08. Pinned `0.5.10` or `agents/lifecycle` are the fallbacks. Socket handling stays in one file so swapping stays cheap.
- **Colyseus:** needs a long-running Node process, which conflicts with free-tier hosting.

Evidence: `specs/research/realtime-server.md`. The client still uses open source `partysocket`.
