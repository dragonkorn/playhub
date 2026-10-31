// Plays the real app in headless Chrome against a running `wrangler dev`.
// Covers what unit tests can't see: wiring, translations, drag, layouts at 10 players.
// Run: node scripts/e2e-ui.mjs [baseUrl] [screenshotDir] [scenario]
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as joinPath } from "node:path";
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:8787";
const shots = process.argv[3] ?? joinPath(tmpdir(), "playhub-e2e");
const only = process.argv[4];
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = (page, name) => page.screenshot({ path: joinPath(shots, `${name}.png`) });

function check(ok, label) {
  if (!ok) throw new Error(`Failed: ${label}`);
  console.log(`ok - ${label}`);
}

/** Playback runs fast by default, so whole games finish quickly. */
async function device(label, fxSpeed = 20) {
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  await context.addInitScript((speed) => localStorage.setItem("playhub.pref.fxSpeed", speed), String(fxSpeed));
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${label}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  return page;
}

async function create(page, name) {
  await page.goto(base);
  await page.locator("input").fill(name);
  await page.getByRole("button", { name: "สร้างห้อง" }).click();
  await page.waitForURL(/\/room\//);
  await page.getByText("รหัสห้อง").waitFor();
  return page.url().split("/").pop();
}

async function join(page, code, name) {
  await page.goto(`${base}/join/${code}`);
  await page.locator("input").nth(1).fill(name);
  await page.getByRole("button", { name: "เข้าร่วม" }).click();
  await page.waitForURL(/\/room\//);
  await page.getByText("รหัสห้อง").waitFor();
}

async function start(host) {
  await host.getByRole("button", { name: "เริ่มเกม" }).click();
  await host.getByRole("heading", { name: "วางกองเรือ" }).waitFor();
}

async function ready(page) {
  await page.getByRole("button", { name: "สุ่ม" }).click();
  await page.getByRole("button", { name: "พร้อมแล้ว" }).click();
}

const myTurn = (page) => page.getByRole("heading", { name: "ตาคุณ" }).isVisible();
const shipCount = (page) => page.locator('main img[style*="position: absolute"]').count();

/** Fires once and waits for the turn to pass, so the next read isn't this turn's stale header. */
const aimAndFire = async (page) => {
  await page.getByRole("button", { name: /^[A-J]\d+$/ }).first().click();
  await page.getByRole("button", { name: /^ยิงที่/ }).click();
};

async function fire(page) {
  await aimAndFire(page);
  await page.getByRole("heading", { name: "ตาคุณ" }).waitFor({ state: "hidden" });
}

async function waitTurn(pages) {
  for (let i = 0; i < 200; i++) {
    for (const page of pages) if (await myTurn(page)) return page;
    await pause(25);
  }
  return null;
}

/** Real touch events, because Chromium's mouse path can hide touch-action bugs. */
async function touchDrag(page, from, to) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, point) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: point ? [point] : [] });
  await touch("touchStart", from);
  for (let i = 1; i <= 8; i++) {
    await touch("touchMove", { x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 });
  }
  await touch("touchEnd");
  await pause(100);
}

async function fullGame() {
  const host = await device("host");
  const guest = await device("guest");
  const code = await create(host, "มีนา");
  await join(guest, code, "Arm");
  await host.getByText("Arm").waitFor();
  await shot(host, "lobby");
  check(!(await host.getByText("options.title").isVisible()), "game text is translated");
  await start(host);

  const carrier = await host.getByRole("button", { name: "เรือบรรทุกเครื่องบิน" }).boundingBox();
  await host.mouse.move(carrier.x + 100, carrier.y + 40);
  await host.mouse.down();
  await host.mouse.move(600, 400, { steps: 8 });
  await shot(host, "setup-dragging");
  await host.mouse.up();
  await pause(100);
  check((await shipCount(host)) === 1, "dragging with a mouse places a ship");

  const cruiser = await host.getByRole("button", { name: "เรือลาดตระเวน" }).boundingBox();
  await touchDrag(host, { x: cruiser.x + 100, y: cruiser.y + 40 }, { x: 600, y: 600 });
  check((await shipCount(host)) === 2, "dragging with touch places a ship");

  await host.getByRole("button", { name: "เรือประจัญบาน" }).click();
  await host.getByRole("button", { name: "A1", exact: true }).click();
  check((await shipCount(host)) === 3, "tap then tap places a ship");
  await host.getByRole("button", { name: "หมุน" }).click();

  await host.reload();
  await host.getByRole("heading", { name: "วางกองเรือ" }).waitFor();
  await pause(300);
  check((await shipCount(host)) === 3, "draft survives a reload");

  await ready(host);
  await ready(guest);

  let fired = 0;
  while (!(await host.getByText("กองสุดท้ายที่เหลืออยู่").isVisible()) && fired < 220) {
    const page = await waitTurn([host, guest]);
    if (!page) break;
    await fire(page);
    fired++;
    if (fired === 60) {
      await pause(150);
      await shot(host, "battle-host");
      await shot(guest, "battle-guest");
    }
    await pause(10);
  }
  await pause(300);
  await shot(host, "result");
  check(await host.getByRole("button", { name: "ดูกระดานทั้งหมด" }).isVisible(), `game finished after ${fired} shots`);
  await host.getByRole("button", { name: "ดูกระดานทั้งหมด" }).click();
  await pause(100);
  await shot(host, "all-boards");
  await host.getByRole("button", { name: "กลับไปหน้าผล" }).click();
  await host.getByRole("button", { name: "เล่นอีกครั้ง" }).click();
  await host.getByRole("button", { name: "เริ่มเกม" }).waitFor();
  check(true, "play again returns to the lobby");
  await host.context().close();
  await guest.context().close();
}

async function disconnect() {
  const host = await device("host");
  const one = await device("one");
  const two = await device("two");
  const code = await create(host, "Mina");
  await join(one, code, "Ploy");
  await join(two, code, "Ben");
  await host.getByRole("button", { name: /เรียงตามคิว/ }).click();
  await two.getByRole("button", { name: /เรียงตามคิว/, pressed: true }).waitFor();
  await start(host);
  for (const page of [one, two]) await page.getByRole("button", { name: "สุ่ม" }).waitFor();
  for (const page of [host, one, two]) await ready(page);

  let current = await waitTurn([host, one, two]);
  await shot(current, "battle-robin");
  if (current === host) {
    await fire(host);
    current = await waitTurn([one, two]);
  }
  const other = current === one ? two : one;
  await current.context().close();
  await pause(32_000);
  await shot(host, "disconnect-host");
  await shot(other, "disconnect-guest");
  check(await other.getByText("เจ้าห้องกำลังตัดสินใจ").isVisible(), "non-host sees the host is deciding");
  await host.getByRole("button", { name: "รอ", exact: true }).click();
  await host.getByRole("button", { name: "ให้แพ้" }).click();
  await shot(host, "disconnect-confirm");
  await host.locator("button.bg-hit", { hasText: "ให้แพ้" }).click();
  await pause(300);
  await shot(host, "disconnect-after");
  check(await host.getByText("ออกแล้ว").isVisible(), "marking lost removes the player and resumes");
  await host.context().close();
  await other.context().close();
}

async function tenPlayers() {
  const names = ["Mina", "Arm", "Ploy", "Ben", "Tee", "Nan", "Joe", "Fah", "Pim", "Kit"];
  const pages = await Promise.all(names.map((n) => device(n)));
  const [host] = pages;
  const code = await create(host, names[0]);
  for (let i = 1; i < 10; i++) await join(pages[i], code, names[i]);
  await host.getByText("Kit").waitFor();
  await shot(host, "ten-lobby");
  await start(host);
  await shot(host, "ten-setup");
  for (const page of pages.slice(1)) await page.getByRole("button", { name: "สุ่ม" }).waitFor();
  for (const page of pages) await ready(page);

  const first = await waitTurn(pages);
  await shot(first, "ten-your-turn");
  await pause(100);
  await fire(first);
  await pause(200);
  await shot(first, "ten-waiting");
  for (const page of pages) await page.context().close();
}

async function elimination() {
  const pages = await Promise.all(["Mina", "Arm", "Ploy"].map((n) => device(n)));
  const [host, one, two] = pages;
  const code = await create(host, "Mina");
  await join(one, code, "Arm");
  await join(two, code, "Ploy");
  await start(host);
  for (const page of [one, two]) await page.getByRole("button", { name: "สุ่ม" }).waitFor();
  for (const page of pages) await ready(page);

  const sunk = (page) => page.getByRole("heading", { name: "กองเรือจม" }).isVisible();
  for (let i = 0; i < 500; i++) {
    const page = await waitTurn(pages);
    if (!page) break;
    await fire(page);
    if (await host.getByText("ออกแล้ว").first().isVisible()) break;
  }
  // The overlay waits for playback to finish on that screen.
  await pause(800);
  let out = null;
  for (const page of pages) if (await sunk(page)) out = page;
  check(out !== null, "a player can be eliminated");
  await shot(out, "eliminated");
  await out.getByRole("button", { name: "ดูต่อ" }).click();
  await pause(100);
  await shot(out, "eliminated-watching");
  check(!(await sunk(out)), "an eliminated player can keep watching");
  await out.getByRole("button", { name: "ดูต่อ" }).waitFor({ state: "detached" });
  for (const page of pages) await page.context().close();
}

/** Real speed, because this checks what each screen shows during a shot (B30 to B35). */
async function feedback() {
  const names = ["Mina", "Arm", "Ploy"];
  const pages = await Promise.all(names.map((n) => device(n, 1)));
  const [host, one, two] = pages;
  const code = await create(host, names[0]);
  await join(one, code, names[1]);
  await join(two, code, names[2]);
  await start(host);
  for (const page of [one, two]) await page.getByRole("button", { name: "สุ่ม" }).waitFor();
  for (const page of pages) await ready(page);

  const shooter = await waitTurn(pages);
  const title = (page) => page.locator("section h2").nth(1).innerText();
  const targetName = (await title(shooter)).replace("น่านน้ำของ", "").trim();
  const nameOf = (page) => names[pages.indexOf(page)];
  const target = pages.find((page) => nameOf(page) === targetName);
  const bystander = pages.find((page) => page !== shooter && page !== target);

  const shipImages = (page) => page.locator('main img[style*="position: absolute"]').count();
  check((await shipImages(bystander)) === 5, "a waiting player sees their own fleet");

  await bystander.getByRole("button", { name: nameOf(shooter), exact: false }).click();
  await pause(100);
  check((await title(bystander)).includes(nameOf(shooter)), "a waiting player can browse another board");
  check((await shipImages(bystander)) === 0, "browsing shows no hidden ships");

  await aimAndFire(shooter);
  await bystander.locator(".fx-flight").waitFor();
  check((await title(bystander)).includes(targetName), "shot camera moves a bystander to the target's board");
  check((await title(target)).includes("กองเรือของคุณ"), "the target stays on their own fleet");
  check((await bystander.locator("ol li").count()) === 0, "the result stays hidden during flight");
  await shot(bystander, "feedback-flight");

  await bystander.locator("ol li").first().waitFor();
  await shot(bystander, "feedback-result");
  await bystander.locator(".fx-flight").waitFor({ state: "hidden" });
  await pause(1100);
  check((await title(bystander)).includes(nameOf(shooter)), "camera returns to the browsed board");

  const next = await waitTurn(pages);
  check(next !== null, "the next shooter gets their turn after playback");
  await shot(next, "feedback-your-turn");

  await bystander.getByRole("button", { name: "เสียง: เปิด" }).click();
  await bystander.reload();
  await bystander.getByRole("button", { name: "เสียง: ปิด" }).waitFor();
  check(true, "mute survives a reload");
  for (const page of pages) await page.context().close();
}

async function languageAndScale() {
  const page = await device("en");
  await page.goto(base);
  check((await page.getByText("Connect Four").count()) + (await page.getByText("เรียงสี่").count()) === 0, "only playable games are listed");
  await page.getByRole("button", { name: "English" }).click();
  check(await page.getByRole("button", { name: "Create room" }).isVisible(), "English switch works");
  await page.reload();
  check(await page.getByRole("button", { name: "Create room" }).isVisible(), "language choice is remembered");
  await page.setViewportSize({ width: 1024, height: 768 });
  await pause(100);
  await shot(page, "small-ipad");
  await page.context().close();
}

/** Spec C6: after the first visit, nothing the app needs comes over the network. */
async function caching() {
  const page = await device("cache");
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await pause(2000);
  await page.reload({ waitUntil: "networkidle" });
  await pause(1000);

  const responses = [];
  page.on("response", (r) => responses.push(r));
  await page.reload({ waitUntil: "networkidle" });

  const isApp = (url) => url.startsWith(base) || /fonts\.(googleapis|gstatic)\.com/.test(url);
  const assets = responses.filter((r) => isApp(r.url()) && !r.url().includes("/rooms"));
  const network = assets.filter((r) => !r.fromServiceWorker());
  for (const r of network) console.error(`  from network: ${r.url()}`);
  check(assets.length > 0 && network.length === 0, `repeat visit served ${assets.length} assets with no downloads`);
  check(assets.some((r) => /fonts\.gstatic\.com/.test(r.url())), "fonts come from the service worker");

  const precachedSounds = await page.evaluate(async () => {
    const lists = await Promise.all((await caches.keys()).map(async (name) => (await caches.open(name)).keys()));
    return lists.flat().filter((request) => request.url.includes(".m4a")).length;
  });
  check(precachedSounds === 8, `all 8 sounds are precached (${precachedSounds})`);

  const hashed = assets.find((r) => r.url().includes("/assets/"));
  const headers = (await fetch(hashed.url(), { method: "HEAD" })).headers.get("cache-control") ?? "";
  check(headers.includes("immutable"), `hashed files are immutable (${headers})`);
  const html = (await fetch(base, { method: "HEAD" })).headers.get("cache-control") ?? "";
  check(!html.includes("immutable"), "HTML still revalidates, so deploys reach players");
  await page.context().close();
}

const scenarios = { caching, feedback, fullGame, tenPlayers, elimination, languageAndScale, disconnect };
for (const [name, run] of Object.entries(scenarios)) {
  if (!only || only === name) await run();
}
await browser.close();

for (const error of errors.slice(0, 10)) console.error(error);
check(errors.length === 0, "no console errors");
console.log(`All UI checks passed. Screenshots: ${shots}`);
