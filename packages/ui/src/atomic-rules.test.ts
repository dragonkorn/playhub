import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const LAYERS = ["atoms", "molecules", "organisms", "templates", "pages"];
const GAMES = readdirSync(join(ROOT, "games"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
const AREAS = ["packages/ui/src", "apps/web/src", ...GAMES.map((game) => `games/${game}/src/ui`)];
/** Entry points that only start the app or expose a game. */
const ENTRY_FILES = new Set(["apps/web/src/App.tsx", "apps/web/src/main.tsx", ...GAMES.map((game) => `games/${game}/src/ui/index.tsx`)]);
const OUTSIDE_WORLD = /use-room|use-playback|model\/sounds|repositories\//;

const layerOf = (path: string) => LAYERS.findIndex((layer) => path.split("/").includes(layer));

const components = AREAS.flatMap((area) =>
  (readdirSync(join(ROOT, area), { recursive: true }) as string[])
    .filter((file) => file.endsWith(".tsx") && !file.includes(".stories."))
    .map((file) => join(area, file)),
);

const importsOf = (path: string) =>
  [...readFileSync(join(ROOT, path), "utf8").matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1] as string);

const relativeImports = (path: string) =>
  importsOf(path)
    .filter((target) => target.startsWith("."))
    .map((target) => relative(ROOT, resolve(ROOT, dirname(path), target)));

describe("atomic design rules", () => {
  it("finds components to check", () => {
    expect(components.length).toBeGreaterThan(10);
  });

  it("keeps every component in a layer folder", () => {
    const stray = components.filter((path) => layerOf(path) === -1 && !ENTRY_FILES.has(path));
    expect(stray).toEqual([]);
  });

  it("imports only from the same layer or lower (A1)", () => {
    const broken = components.flatMap((path) => {
      const own = layerOf(path);
      if (own === -1) return [];
      return relativeImports(path)
        .filter((target) => layerOf(target) > own)
        .map((target) => `${path} -> ${target}`);
    });
    expect(broken).toEqual([]);
  });

  it("keeps translation out of atoms and molecules (A2)", () => {
    const broken = components.filter((path) => layerOf(path) >= 0 && layerOf(path) <= 1 && importsOf(path).includes("react-i18next"));
    expect(broken).toEqual([]);
  });

  it("keeps outside-world hooks in pages (A3)", () => {
    const broken = components.filter(
      (path) => layerOf(path) >= 0 && layerOf(path) < 4 && relativeImports(path).some((target) => OUTSIDE_WORLD.test(target)),
    );
    expect(broken).toEqual([]);
  });

  it("keeps games independent of the platform (A7)", () => {
    const broken = components.filter((path) => path.startsWith("games/") && importsOf(path).some((target) => target.includes("apps/web")));
    expect(broken).toEqual([]);
  });
});
