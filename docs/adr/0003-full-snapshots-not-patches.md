# Server sends full per-player snapshots, not patches

After every change, each connected player receives a complete snapshot built for them, even though patches would be smaller. Outgoing WebSocket messages are free on Cloudflare, game state is small, and reconnect becomes the same code path as normal play, so clients can't drift out of sync.
