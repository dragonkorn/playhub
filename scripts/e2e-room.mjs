// End-to-end check against a running `wrangler dev`: plays a full Battleship game
// over real HTTP and WebSockets, including a reconnect, then a Four in a Row game.
// Run `pnpm build`, then `pnpm dev:server`, then: pnpm test:e2e
const base = process.argv[2] ?? "http://localhost:8787";
const wsBase = base.replace(/^http/, "ws");

const SHIPS = { carrier: 5, battleship: 4, cruiser: 3, submarine: 3, destroyer: 2 };
const fleet = Object.keys(SHIPS).map((ship, row) => ({ ship, row, col: 0, orientation: "horizontal" }));

async function post(path, body) {
  const response = await fetch(base + path, { method: "POST", body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(`${path}: ${json.code}`);
  return json;
}

function open(code, token) {
  const client = { snapshot: null, rejected: [], waiters: [] };
  client.ready = new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/rooms/${code}/ws?token=${token}`);
    client.socket = socket;
    socket.onopen = () => resolve();
    socket.onerror = () => reject(new Error("socket failed"));
    socket.onmessage = ({ data }) => {
      if (data === "pong") return;
      const message = JSON.parse(data);
      if (message.type === "rejected") client.rejected.push(message.code);
      if (message.type === "snapshot") client.snapshot = message.snapshot;
      client.waiters.splice(0).forEach((wake) => wake());
    };
  });
  client.send = (message) => client.socket.send(JSON.stringify(message));
  client.until = async (check, label) => {
    const deadline = Date.now() + 5000;
    while (!(client.snapshot && check(client.snapshot))) {
      if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
      await new Promise((resolve) => {
        client.waiters.push(resolve);
        setTimeout(resolve, 100);
      });
    }
    return client.snapshot;
  };
  return client;
}

const assert = (ok, label) => {
  if (!ok) throw new Error(`Failed: ${label}`);
  console.log(`ok - ${label}`);
};

const host = await post("/rooms", { gameId: "battleship", name: "มีนา" });
assert(/^[2-9A-HJ-NP-Z]{4}$/.test(host.code), "room code uses the safe alphabet");
const guest = await post(`/rooms/${host.code.toLowerCase()}/join`, { name: "Arm" });

const refused = await fetch(`${base}/rooms/${host.code}/join`, { method: "POST", body: '{"name":"arm"}' });
assert(refused.status === 409 && (await refused.json()).code === "name_taken", "duplicate name refused");
const refusedSocket = await open(host.code, "nope").ready.then(() => false, () => true);
assert(refusedSocket, "bad token refused");

const a = open(host.code, host.token);
let b = open(host.code, guest.token);
await Promise.all([a.ready, b.ready]);
await a.until((s) => s.players.every((p) => p.connection === "online"), "both online");
assert(!JSON.stringify(a.snapshot).includes(host.token), "snapshot has no token");

a.send({ type: "setOptions", options: { targeting: "robin" } });
await b.until((s) => s.options.targeting === "robin", "options reach guest");
a.send({ type: "start" });
await Promise.all([a, b].map((c) => c.until((s) => s.phase === "playing" && s.view, "game started")));

for (const client of [a, b]) client.send({ type: "move", version: client.snapshot.version, move: { type: "ready", fleet } });
await Promise.all([a, b].map((c) => c.until((s) => s.view?.phase === "battle", "battle started")));
assert(b.snapshot.view.allFleets === null, "fleets hidden during play");

// Reconnect mid-game: the guest gets their own view back.
b.socket.close();
await a.until((s) => s.players.some((p) => p.connection === "reconnecting"), "disconnect seen");
b = open(host.code, guest.token);
await b.ready;
await a.until((s) => s.players.every((p) => p.connection === "online"), "reconnect seen");
assert((await b.until((s) => s.view !== null, "view")).view.myFleet.length === 5, "reconnect restores own fleet");

const clients = { [host.playerId]: a, [guest.playerId]: b };
const shots = fleet.flatMap((p) => Array.from({ length: SHIPS[p.ship] }, (_, col) => ({ row: p.row, col })));
const next = { [host.playerId]: 0, [guest.playerId]: 0 };
while (a.snapshot.phase === "playing") {
  await Promise.all([a, b].map((c) => c.until((s) => s.version >= a.snapshot.version, "sync")));
  const current = a.snapshot.view.current;
  const client = clients[current];
  const cell = shots[next[current]++];
  const version = client.snapshot.version;
  client.send({ type: "move", version, move: { type: "fire", target: client.snapshot.view.forcedTarget, ...cell } });
  await client.until((s) => s.version > version, "shot applied");
  await a.until((s) => s.version >= client.snapshot.version, "host in sync");
}
await b.until((s) => s.phase === "finished", "guest sees finish");
assert(a.snapshot.ranking.length === 2, "ranking has both players");
assert(Object.keys(a.snapshot.view.allFleets).length === 2, "fleets revealed at the end");
assert(a.rejected.length + b.rejected.length === 0, "no moves rejected");

a.socket.close();
b.socket.close();

// Four in a Row: the first player stacks column 0 and wins on their fourth disc.
const yellow = await post("/rooms", { gameId: "four-in-a-row", name: "Ploy" });
const red = await post(`/rooms/${yellow.code}/join`, { name: "Ben" });
const third = await fetch(`${base}/rooms/${yellow.code}/join`, { method: "POST", body: '{"name":"Kit"}' });
assert(third.status === 409 && (await third.json()).code === "room_full", "four in a row takes two players");
const c = open(yellow.code, yellow.token);
const d = open(yellow.code, red.token);
await Promise.all([c.ready, d.ready]);
await c.until((s) => s.players.every((p) => p.connection === "online"), "both online");
c.send({ type: "start" });
await Promise.all([c, d].map((x) => x.until((s) => s.phase === "playing" && s.view, "four in a row started")));
const seats = { [yellow.playerId]: c, [red.playerId]: d };
const first = c.snapshot.view.order[0];
while (c.snapshot.phase === "playing") {
  const current = c.snapshot.view.current;
  const client = seats[current];
  await client.until((s) => s.view.current === current, "turn reached");
  const version = client.snapshot.version;
  client.send({ type: "move", version, move: { type: "drop", column: current === first ? 0 : 1 } });
  await c.until((s) => s.version > version, "drop applied");
}
await d.until((s) => s.phase === "finished", "red sees finish");
assert(c.snapshot.ranking[0][0] === first && c.snapshot.view.line.length === 4, "four up wins with its line");
assert(c.rejected.length + d.rejected.length === 0, "no drops rejected");
c.socket.close();
d.socket.close();
console.log("All end-to-end checks passed");
