// Rule-based wiki checks, so these don't need an LLM.
// node scripts/wiki.mjs changes   what changed since the last ingest
// node scripts/wiki.mjs lint      broken links, orphans, bad frontmatter
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WIKI = join(ROOT, "wiki");
const META_PAGES = new Set(["index.md", "golden-set.md"]);
const IGNORED = [/^wiki\//, /^design\//, /^scripts\//, /^\.claude\//, /^CLAUDE\.md$/, /^pnpm-lock\.yaml$/];
const FULL_INGEST_RATIO = 0.3;

const git = (...args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);

function parsePage(file) {
  const text = readFileSync(join(WIKI, file), "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  const front = match?.[1] ?? "";
  return {
    file,
    text,
    status: front.match(/^status: (.+)$/m)?.[1],
    commit: front.match(/^ingested_commit: (.+)$/m)?.[1],
    sources: [...front.matchAll(/^ {2}- (.+)$/gm)].map((m) => m[1]),
  };
}

const pages = () =>
  readdirSync(WIKI, { recursive: true })
    .filter((f) => f.endsWith(".md"))
    .map(parsePage);

const covers = (source, file) => (source.endsWith("/") ? file.startsWith(source) : file === source);
const tracked = (files) => files.filter((f) => !IGNORED.some((re) => re.test(f)));

function changes() {
  const all = pages();
  const base = all.find((p) => p.file === "index.md")?.commit;
  if (!base) throw new Error("wiki/index.md has no ingested_commit");

  const changed = tracked([
    ...git("diff", "--name-only", base),
    ...git("ls-files", "--others", "--exclude-standard"),
  ]);
  const total = tracked(git("ls-files")).length;
  const content = all.filter((p) => !META_PAGES.has(p.file));

  console.log(`Base commit: ${base}`);
  console.log(`Changed: ${changed.length} of ${total} files`);
  if (changed.length / total > FULL_INGEST_RATIO) console.log("FULL INGEST: over 30% of files changed");

  console.log("\nAffected pages:");
  for (const page of content) {
    const hit = changed.filter((f) => page.sources.some((s) => covers(s, f)));
    if (hit.length) console.log(`  wiki/${page.file}: ${hit.join(", ")}`);
  }

  const unmapped = changed.filter((f) => !content.some((p) => p.sources.some((s) => covers(s, f))));
  console.log(`\nUnmapped files: ${unmapped.length ? "" : "none"}`);
  for (const file of unmapped) console.log(`  ${file}`);
}

function lint() {
  const all = pages();
  const errors = [];
  const linked = new Set(["index.md"]);

  for (const page of all) {
    for (const [, target] of page.text.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
      const path = normalize(join(dirname(join(WIKI, page.file)), target));
      if (!existsSync(path)) errors.push(`${page.file}: broken link ${target}`);
      linked.add(relative(WIKI, path));
    }
    if (META_PAGES.has(page.file)) continue;
    if (!["planned", "implemented"].includes(page.status)) errors.push(`${page.file}: bad status`);
    if (!page.sources.length) errors.push(`${page.file}: no sources`);
    for (const source of page.sources) {
      if (!existsSync(join(ROOT, source))) errors.push(`${page.file}: missing source ${source}`);
    }
  }
  for (const page of all) {
    if (!linked.has(page.file)) errors.push(`${page.file}: orphan, not linked from any page`);
  }

  for (const error of errors) console.error(error);
  console.log(errors.length ? `${errors.length} problems` : `OK: ${all.length} pages`);
  process.exitCode = errors.length ? 1 : 0;
}

const commands = { changes, lint };
const command = commands[process.argv[2]];
if (!command) throw new Error("Usage: node scripts/wiki.mjs changes|lint");
command();
