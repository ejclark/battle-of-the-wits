// THE DERIVED MODEL — one reading of the repository, shared by every view of it.
//
// The visual ladder (2D overview → isometric city → navigable 3D → cinematic capture) has one
// load-bearing constraint, and it is this file: **each rung is a new VIEW, never a new source of
// truth.** The moment a renderer computes its own idea of what a "big file" or a "district" is, the
// map and the city start disagreeing, and both start flattering the repository — which is the exact
// failure the gates exist to prevent, reintroduced through the front door as decoration.
//
// So: every number here comes from committed state — file sizes on disk, budgets in `*-budget.json`,
// ADRs in `docs/adr`. Nothing is estimated, nothing is invented, and a dimension the repo cannot
// measure is reported as UNLIT rather than as zero. A city with no dark quarters would be a lie.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { bossList, dimensionStanding, readJson, unlitDimensions } from "./state.mjs";

const DEFAULT_CAP = 500; // a file with no budget entry may not exceed this
const WARN_AT = 300; // worth watching even when within budget

/**
 * The capability descriptor, read here rather than imported from `harness-gates`.
 *
 * Deliberate duplication across the PLUGIN boundary, which is a real boundary rather than the
 * imagined one the duplication gate once defended: an adopter may install `harness-core` alone, and
 * a cross-plugin import would resolve only in a checkout of this repository.
 */
function descriptor(root) {
  const d = { sourceDir: "src", sourceExt: ".ts", exclude: [] };
  try {
    Object.assign(d, JSON.parse(readFileSync(join(root, "harness.json"), "utf8")));
  } catch {
    /* defaults describe a conventional repo */
  }
  return d;
}

function walk(dir, pred, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, acc);
    else if (pred(e.name)) acc.push(p);
  }
  return acc;
}

/** Every ADR, in order. A cleared room on the map; a monument in the city. */
export function rooms(root) {
  const dir = join(root, "docs/adr");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{4}-/.test(f) && f.endsWith(".md") && !f.startsWith("0000"))
    .sort()
    .map((file) => {
      const body = readFileSync(join(dir, file), "utf8");
      const title = (body.match(/^#\s*ADR-\d+:\s*(.+)$/m) ?? [, file.replace(/\.md$/, "")])[1].trim();
      const status = (body.match(/\*\*Status:\*\*\s*([^\n<]+)/) ?? [, "Unknown"])[1].trim();
      const date = (body.match(/\*\*Date:\*\*\s*([^\n]+)/) ?? [, ""])[1].trim();
      return { id: file.slice(0, 4), file, title, status, date, superseded: /Superseded/i.test(status) };
    });
}

/**
 * The repository as districts of buildings.
 *
 * A DISTRICT is a top-level directory under the source root — the coarsest grouping the repo itself
 * declares, so the layout is the project's own architecture rather than an opinion imposed on it.
 * A BUILDING is a source file; its height is its line count, and its state comes from the committed
 * budget: `over` (violating), `watch` (large but within budget), or `ok`.
 *
 * Height is capped for RENDERING only — a 900-line file must not draw a tower off the canvas — and
 * the true line count travels with it, so the view can be dramatic while the number stays honest.
 */
export function districts(root) {
  const desc = descriptor(root);
  const src = join(root, desc.sourceDir);
  const budget = readJson(root, "arch-budget.json") ?? {};
  const rel = (f) => relative(root, f).split("\\").join("/");
  const excluded = (p) => (desc.exclude ?? []).some((x) => p.startsWith(x));

  const byDistrict = new Map();
  for (const abs of walk(src, (n) => n.endsWith(desc.sourceExt) && !n.endsWith(".d.ts"))) {
    const path = rel(abs);
    if (excluded(path)) continue;
    const lines = readFileSync(abs, "utf8").split("\n").length;
    const cap = typeof budget[path] === "number" ? budget[path] : DEFAULT_CAP;
    const within = path.slice(desc.sourceDir.length + 1);
    const name = within.includes("/") ? within.slice(0, within.indexOf("/")) : ".";
    if (!byDistrict.has(name)) byDistrict.set(name, []);
    byDistrict.get(name).push({
      path,
      name: path.split("/").pop(),
      lines,
      cap,
      state: lines > cap ? "over" : lines > WARN_AT ? "watch" : "ok",
    });
  }

  return [...byDistrict.entries()]
    .map(([name, buildings]) => ({
      name,
      buildings: buildings.sort((a, b) => b.lines - a.lines),
      lines: buildings.reduce((n, b) => n + b.lines, 0),
      over: buildings.filter((b) => b.state === "over").length,
    }))
    .sort((a, b) => b.lines - a.lines);
}

/** One reading of the repository, for any view that wants to draw it. */
export function repoModel(root) {
  return {
    districts: districts(root),
    rooms: rooms(root),
    bosses: bossList(root),
    unlit: unlitDimensions(root),
    // Both halves of the same reading. `unlit` is what a view needs to refuse to render a dark
    // dimension as clean; `standing` is what a view needs to draw COVERAGE, which is a ratio and
    // therefore needs the denominator. A rung that counted the lit ones itself would be a second
    // opinion about what this repository measures, and the whole ladder rests on there being one.
    standing: dimensionStanding(root),
  };
}
