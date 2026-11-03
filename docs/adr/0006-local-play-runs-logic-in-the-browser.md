# Local play runs game logic in the browser

Players asked to play two people on one device, including with no network. The web app runs the game's `logic` itself for games that declare `localPlay`, instead of seating both players in a server room, because local play needs no referee and must work offline. Only games with no hidden information may opt in, so G3's reason for keeping `logic` on the server, protecting secrets, still holds.

Rejected: two seats on one device inside an online room, which reuses the room screens but needs a connection. Consequence: a local-play game's `logic` ships in the web bundle.
