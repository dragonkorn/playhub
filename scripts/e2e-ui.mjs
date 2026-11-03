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
const PHONE = { width: 390, height: 844 };

async function device(label, fxSpeed = 20, viewport = { width: 1180, height: 820 }) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  await context.addInitScript((speed) => localStorage.setItem("playhub.pref.fxSpeed", speed), String(fxSpeed));
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${label}: ${m.text()} ${m.location().url}`);
  });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  return page;
}

async function create(page, name, game) {
  await page.goto(base);
  if (game) await page.getByRole("button", { name: new RegExp(`^${game}`) }).click();
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
  check(await page.getByRole("button", { name: /^เรียงสี่/ }).isVisible(), "every game is listed");
  check(await page.getByRole("button", { name: /^ใบ้เรียง/ }).isVisible(), "ใบ้เรียง is listed");
  check((await page.getByText(/connect\s*four/i).count()) === 0, "the trademark name never shows");
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
  check(precachedSounds === 19, `all 19 sounds are precached (${precachedSounds})`);

  const hashed = assets.find((r) => r.url().includes("/assets/"));
  const headers = (await fetch(hashed.url(), { method: "HEAD" })).headers.get("cache-control") ?? "";
  check(headers.includes("immutable"), `hashed files are immutable (${headers})`);
  const html = (await fetch(base, { method: "HEAD" })).headers.get("cache-control") ?? "";
  check(!html.includes("immutable"), "HTML still revalidates, so deploys reach players");
  await page.context().close();
}

/** Four in a Row at real speed: whoever moves first stacks column 1 and wins (F7, F13, F18, F19). */
async function fourInARow() {
  const host = await device("host", 1);
  const guest = await device("guest", 1);
  const code = await create(host, "มีนา", "เรียงสี่");
  await join(guest, code, "Arm");
  await host.getByText("Arm").waitFor();
  await host.getByRole("button", { name: "เริ่มเกม" }).click();

  const first = await waitTurn([host, guest]);
  const second = first === host ? guest : host;
  await shot(first, "four-your-turn");
  for (let move = 0; move < 7; move++) {
    const page = move % 2 === 0 ? first : second;
    if (move > 0) await page.getByRole("heading", { name: "ตาคุณ" }).waitFor({ timeout: 10_000 });
    const column = move % 2 === 0 ? 1 : 2;
    await page.getByRole("button", { name: `ช่อง ${column}`, exact: true }).click();
    if (move === 0) {
      check(await page.locator("main span.opacity-60").isVisible(), "picking a column shows a ghost disc");
      await shot(page, "four-picked");
    }
    await page.getByRole("button", { name: `ปล่อยที่ช่อง ${column}` }).click();
    if (move === 0) {
      await second.locator(".fir-fall").waitFor();
      check(true, "the other screen plays the fall");
      await shot(second, "four-falling");
    }
  }
  await second.getByText("ชนะ!").waitFor();
  await shot(second, "four-win-banner");
  check((await second.locator(".fir-line").count()) === 4, "the winning line is marked");
  await host.getByText("เรียงสี่ได้ก่อน").waitFor({ timeout: 10_000 });
  await shot(host, "four-result");
  await host.getByRole("button", { name: "ดูกระดานทั้งหมด" }).click();
  check((await host.locator(".fir-line").count()) === 4, "the final board keeps the line");
  await host.getByRole("button", { name: "กลับไปหน้าผล" }).click();
  await host.getByRole("button", { name: "เล่นอีกครั้ง" }).click();
  await host.getByRole("button", { name: "เริ่มเกม" }).waitFor();
  check(true, "play again returns to the lobby");
  await host.context().close();
  await guest.context().close();
}

/** Fills the board with no line, so the result screen shows a draw (F9, L6). */
async function fourInARowDraw() {
  const DRAW = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 4, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 5];
  const host = await device("host");
  const guest = await device("guest");
  const code = await create(host, "มีนา", "เรียงสี่");
  await join(guest, code, "Arm");
  await host.getByText("Arm").waitFor();
  await host.getByRole("button", { name: "เริ่มเกม" }).click();
  for (const column of DRAW) {
    const page = await waitTurn([host, guest]);
    if (!page) break;
    await page.getByRole("button", { name: `ช่อง ${column + 1}`, exact: true }).click();
    await page.getByRole("button", { name: `ปล่อยที่ช่อง ${column + 1}` }).click();
    await page.getByRole("heading", { name: "ตาคุณ" }).waitFor({ state: "hidden" });
  }
  await host.getByText("กระดานเต็ม ไม่มีใครเรียงสี่ได้").waitFor({ timeout: 10_000 });
  check(await host.getByRole("heading", { name: "เสมอ" }).isVisible(), "a full board is a draw");
  check((await host.locator("ol li").filter({ hasText: /^1\./ }).count()) === 2, "both players share first place");
  await shot(host, "four-draw");
  await host.context().close();
  await guest.context().close();
}

/** Two players on one device with the network off (O2 to O7, F23). */
async function localPlay() {
  const page = await device("local");
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil: "networkidle" });
  // A device that has used the app holds every font face. Fonts are cached on first use (C6).
  await page.evaluate(() => Promise.all([...document.fonts].map((face) => face.load().catch(() => null))));
  await pause(500);
  await page.context().setOffline(true);

  await page.getByRole("button", { name: /^เรียงสี่/ }).click();
  await page.getByRole("button", { name: "เล่นในเครื่องนี้" }).click();
  const inputs = page.locator("input");
  await inputs.nth(0).fill("มีนา");
  await inputs.nth(1).fill("มีนา");
  await page.getByRole("button", { name: "เริ่มเล่น" }).click();
  check(await page.getByText("มีคนใช้ชื่อนี้แล้ว").isVisible(), "repeated names are refused");
  await inputs.nth(1).fill("Arm");
  await page.getByRole("button", { name: "เริ่มเล่น" }).click();

  const heading = page.getByRole("heading", { name: /^ตาของ / });
  await heading.waitFor();
  const first = (await heading.innerText()).replace("ตาของ", "").trim();
  const second = first === "มีนา" ? "Arm" : "มีนา";
  await shot(page, "local-turn");
  for (let move = 0; move < 7; move++) {
    const name = move % 2 === 0 ? first : second;
    await page.getByRole("heading", { name: `ตาของ ${name}` }).waitFor();
    const column = move % 2 === 0 ? 1 : 2;
    await page.getByRole("button", { name: `ช่อง ${column}`, exact: true }).click();
    await page.getByRole("button", { name: `ปล่อยที่ช่อง ${column}` }).click();
    if (move === 2) {
      await page.getByRole("heading", { name: `ตาของ ${second}` }).waitFor();
      await page.reload();
      await page.getByRole("heading", { name: `ตาของ ${second}` }).waitFor();
      check((await page.locator("ol li").count()) === 3, "a reload resumes the local game offline");
      move++;
      await page.getByRole("button", { name: "ช่อง 2", exact: true }).click();
      await page.getByRole("button", { name: "ปล่อยที่ช่อง 2" }).click();
    }
  }
  check((await page.getByText("คุณ").count()) === 0, "local play names players instead of saying you");
  await page.getByText("เรียงสี่ได้ก่อน").waitFor({ timeout: 10_000 });
  check(await page.getByRole("heading", { name: `${first} ชนะ` }).isVisible(), "the first player wins on one device");
  await shot(page, "local-result");
  await page.getByRole("button", { name: "เล่นอีกครั้ง" }).click();
  await heading.waitFor();
  check((await page.locator("ol li").count()) === 0, "play again starts a fresh local game");
  await page.context().close();
}

/** Every element that matters sits inside the viewport (C5, criterion 28). */
async function fits(page, label) {
  const size = page.viewportSize();
  const outside = await page.evaluate(({ width, height }) => {
    const items = [...document.querySelectorAll("main button, main h1, main h2, main input, main li")];
    return items
      .map((el) => ({ el, box: el.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.left < -1 || box.top < -1 || box.right > width + 1 || box.bottom > height + 1))
      .map(({ el }) => el.textContent?.trim().slice(0, 30));
  }, size);
  check(outside.length === 0, `${label} fits the ${size.width}x${size.height} frame${outside.length ? `: ${outside.join(", ")}` : ""}`);
}

/** Holds the reveal button for the full second (N16). */
async function holdReveal(page, ms = 1150) {
  const box = await page.getByRole("button", { name: /กดค้างเพื่อเปิด/ }).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await pause(ms);
  await page.mouse.up();
}

/** The number on a player's large card, or null when they hold none. */
async function nextNumber(page) {
  const label = await page.getByRole("button", { name: /กดค้างเพื่อเปิด|เปิดเลขของคุณครบแล้ว/ }).textContent();
  const match = label?.match(/เปิดเลข (\d+)/);
  return match ? Number(match[1]) : null;
}

/** ใบ้เรียง on phones in portrait, with an iPad in landscape: a mistake, then a full win (N5 to N22, L8, C5). */
async function baiRiang() {
  const host = await device("br-host", 1, PHONE);
  await host.goto(base);
  await fits(host, "home");
  const code = await create(host, "มีนา", "ใบ้เรียง");
  await fits(host, "lobby");
  const arm = await device("br-arm", 1, PHONE);
  await arm.goto(`${base}/join/${code}`);
  await fits(arm, "join");
  await join(arm, code, "Arm");
  const ipad = await device("br-ipad", 1);
  await join(ipad, code, "ต้น");
  const pages = [host, arm, ipad];
  await host.getByText("ต้น").waitFor();
  await host.getByRole("button", { name: "เริ่มเกม" }).click();
  for (const page of pages) await page.getByRole("button", { name: /กดค้างเพื่อเปิด/ }).waitFor();
  check((await host.locator("[data-frame=portrait]").count()) === 1, "a phone plays in the portrait frame");
  check((await ipad.locator("[data-frame=landscape]").count()) === 1, "an iPad plays in the landscape frame");
  await fits(host, "phone game screen");
  await fits(ipad, "iPad game screen");
  await shot(ipad, "bai-riang-ipad");

  const numbers = async () => Promise.all(pages.map(nextNumber));
  let level = await numbers();
  const highest = level.indexOf(Math.max(...level));

  // A short tap reveals nothing (N16).
  await holdReveal(pages[highest], 300);
  await pause(500);
  check(JSON.stringify(await numbers()) === JSON.stringify(level), "releasing early cancels the reveal");

  // Revealing the highest first skips the other two: 2 lives (N7, N21).
  await holdReveal(pages[highest]);
  await host.getByRole("alert").getByText("พลาด!").waitFor();
  check(await host.getByText("−2 · เหลือ 1 ชีวิต").isVisible(), "a mistake costs a life per skipped number");
  await shot(host, "bai-riang-mistake");
  await host.getByRole("button", { name: "ไปด่าน 2" }).waitFor({ timeout: 10_000 });
  await fits(host, "cleared level");

  for (let next = 2; next <= 3; next++) {
    await arm.getByRole("button", { name: `ไปด่าน ${next}` }).click();
    for (const page of pages) await page.getByRole("button", { name: /กดค้างเพื่อเปิด/ }).waitFor();
    check((await host.locator("main ol li").count()) === next, `level ${next} deals ${next} numbers each (N2, N15)`);
    if (next === 3) await shot(host, "bai-riang-level3");
    for (let reveal = 0; reveal < pages.length * next; reveal++) {
      level = await numbers();
      const lowest = Math.min(...level.filter((n) => n !== null));
      await holdReveal(pages[level.indexOf(lowest)]);
      await pause(400);
    }
    if (next === 2) await host.getByRole("button", { name: "ไปด่าน 3" }).waitFor({ timeout: 10_000 });
  }

  await host.getByText("ผ่านครบ 3 ด่าน").waitFor({ timeout: 10_000 });
  check(await host.getByRole("heading", { name: "ทีมชนะ!" }).isVisible(), "the team result says the team won (L8, L9)");
  await fits(host, "team result");
  await shot(host, "bai-riang-result");
  await host.getByRole("button", { name: "ดูลำดับที่เปิด" }).click();
  await host.getByRole("button", { name: "กลับไปหน้าผล" }).click();
  await host.getByRole("heading", { name: "ทีมชนะ!" }).waitFor();
  for (const page of pages) await page.context().close();
}

const scenarios = { caching, feedback, fullGame, tenPlayers, elimination, languageAndScale, disconnect, fourInARow, fourInARowDraw, localPlay, baiRiang };
for (const [name, run] of Object.entries(scenarios)) {
  if (!only || only === name) await run();
}
await browser.close();

for (const error of errors.slice(0, 10)) console.error(`  ${error}`);
check(errors.length === 0, "no console errors");
console.log(`All UI checks passed. Screenshots: ${shots}`);
