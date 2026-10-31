# One Cloudflare Worker serves the app and the API

The Worker that holds the Durable Objects also serves the web build as static assets, replacing the original plan of Cloudflare Pages plus a separate Worker. This gives one origin, one deploy and no CORS, at the same free-tier cost.
