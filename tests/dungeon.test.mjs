// The dungeon is a presentation layer over measured state — so the thing worth testing is that it
// never says something the repo doesn't support.
//
// A themed view earns its keep only while it stays honest. The failure mode is a display that reads
// encouraging regardless of reality: loot shown as earned when it isn't, depth counted for doors
// never opened, or a dimension nothing can measure quietly rendering as fine. Each case below pins
// one of those.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRepo, bin, runLauncher } from "./helpers.mjs";
import { plan } from "../plugins/harness-core/lib/phases.mjs";
import { execFileSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
/** A repository that has done everything a working tree can record. Shared: two cases need the
 *  identical fixture, and the clone gate caught the second copy the moment it existed. */
const ADOPTED = {
    "package.json": '{"scripts":{"verify":"npm test"}}\n',
    "harness.json": '{"testDir":"tests"}',
    "biome.json": "{}",
    "tests/arch/gates.test.mjs": "// gates\n",
    ".github/workflows/pipeline.yml": "name: Pipeline\n",
    "node_modules/.keep": "",
    ".husky/_/.keep": "",
    "arch-budget.json": "{}",
    "dupe-budget.json": '{"duplicateDefs":0}',
    "dead-budget.json": "{}",
    "spec-gap-budget.json": '{"untestedFiles":0}',
    "clone-budget.json": '{"clones":0}',
    "docs/LESSONS.md": "# Lessons\n",
  };

const BIN = bin("harness-core", "harness-dungeon");
const run = (cwd) => runLauncher(BIN, [], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });


test("an untouched repo is at the door with every power locked", () => {
  const root = makeRepo({ "package.json": "{}\n" });
  try {
    const out = run(root);
    assert.match(out, /depth 0 of 5/);
    assert.match(out, /you are at the door/);
    assert.match(out, /Merge-on-green\s+— locked/);
    assert.match(out, /Autonomous athletes\s+— locked/);
    assert.doesNotMatch(out, /✦ Merge-on-green/, "no capability may read as earned in an empty repo");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("depth counts only the contiguous prefix — a later phase satisfied by accident is not progress", () => {
  // Budgets exist (a phase-3 condition) but nothing is installed. You cannot be past a door you
  // never opened, so depth must still be 0.
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"src/big.ts":900}',
    "dupe-budget.json": '{"duplicateDefs":3}',
  });
  try {
    const out = run(root);
    assert.match(out, /depth 0 of 5/, "an incidentally-satisfied later phase must not advance depth");
    assert.match(out, /The Threshold/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bosses come from committed budgets, biggest first", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"src/small.ts":100,"src/huge.ts":2000,"src/mid.ts":500}',
    "spec-gap-budget.json": '{"untestedFiles":7}',
  });
  try {
    const out = run(root);
    const bosses = out.slice(out.indexOf("BOSSES"), out.indexOf("LOOT"));
    assert.match(bosses, /src\/huge\.ts/);
    assert.match(bosses, /2000 lines/, "the boss must carry its measured stat");
    assert.ok(
      bosses.indexOf("huge.ts") < bosses.indexOf("mid.ts"),
      "bosses must be ordered by size, so the biggest threat reads first",
    );
    assert.match(bosses, /7 modules with no spec/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unmeasured dimensions surface as fog, never as a pass", () => {
  const root = makeRepo({ "package.json": "{}\n" });
  try {
    const out = run(root);
    const fog = out.slice(out.indexOf("FOG OF WAR"));
    assert.match(fog, /dead code/, "an unmeasurable dimension must be named");
    assert.match(fog, /unfrozen/, "unfrozen debt must be named — nothing is holding the line");
    assert.match(fog, /no lessons ledger/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the map is the ADR history, and says so plainly when there isn't one", () => {
  const bare = makeRepo({ "package.json": "{}\n" });
  const mapped = makeRepo({
    "package.json": "{}\n",
    "docs/adr/0001-pick-a-datastore.md": "# ADR\n",
    "docs/adr/0002-split-the-server.md": "# ADR\n",
  });
  try {
    assert.match(run(bare), /unmapped/, "no ADRs must read as unmapped, not as clean");
    const out = run(mapped);
    assert.match(out, /0001-pick-a-datastore/);
    assert.match(out, /0002-split-the-server/);
  } finally {
    rmSync(bare, { recursive: true, force: true });
    rmSync(mapped, { recursive: true, force: true });
  }
});

test("it renders in a directory with nothing at all rather than crashing", () => {
  const root = mkdtempSync(join(tmpdir(), "botw-dungeon-"));
  try {
    const out = run(root);
    assert.match(out, /THE DUNGEON/);
    assert.doesNotMatch(out, /ENOENT|undefined|NaN/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── the forge ──────────────────────────────────────────────────────────────────
const forgeRun = (cwd) =>
  runLauncher(BIN, ["--new"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

test("the forge invents nothing — every encounter traces to a committed budget", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"src/colossus.ts":2400,"src/mid.ts":600,"src/small.ts":80}',
    "dupe-budget.json": '{"duplicateDefs":12}',
  });
  try {
    const out = forgeRun(root);
    assert.match(out, /colossus\.ts/, "the biggest file must be named, not described vaguely");
    assert.match(out, /2400 lines/);
    assert.match(out, /12 duplicated definitions/);
    // Nothing may be offered that no budget supports.
    assert.doesNotMatch(out, /copy-pasted blocks/, "no clone budget means no clone encounter");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unmeasured dimensions become unlit encounters, never silence", () => {
  const root = makeRepo({ "package.json": "{}\n", "arch-budget.json": '{"a.ts":100}' });
  try {
    const out = forgeRun(root);
    const unlit = out.slice(out.indexOf("UNLIT"));
    assert.match(unlit, /dead code/);
    assert.match(unlit, /duplication/);
    assert.match(unlit, /harness-dupe-scan --update/, "each unlit dimension must carry its fix");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the hand offers distinct characters, not a ranked list", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"a.ts":2000,"b.ts":900,"c.ts":400}',
  });
  try {
    const out = forgeRun(root);
    const hand = out.slice(out.indexOf("YOUR MOVE"));
    assert.match(hand, /biggest threat/);
    assert.match(hand, /quickest win/);
    assert.match(hand, /Light the dark/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the spec gap is marked as a prerequisite for the big decomposition", () => {
  // Decomposing what nothing asserts on is the dangerous order — the forge has to say so.
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": '{"big.ts":1500}',
    "spec-gap-budget.json": '{"untestedFiles":9}',
  });
  try {
    const out = forgeRun(root);
    assert.match(out, /fight this BEFORE The Colossus/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a clean, fully-measured repo says so instead of inventing a fight", () => {
  const root = makeRepo({
    "package.json": "{}\n",
    "arch-budget.json": "{}",
    "dupe-budget.json": '{"duplicateDefs":0}',
    "dead-budget.json": "{}",
    "spec-gap-budget.json": '{"untestedFiles":0}',
    "clone-budget.json": '{"clones":0}',
    "docs/LESSONS.md": "# Lessons\n",
  });
  try {
    const out = forgeRun(root);
    assert.match(out, /nothing here to fight/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test("a capability that cannot be observed is UNKNOWN, never locked — once you have reached it", () => {
  // The false RED, which is the same defect as a false green wearing the other colour.
  //
  // Merge-on-green and auto-merge are REPOSITORY SETTINGS. A process reading a working tree cannot
  // see them, so phases.mjs marked them done:false forever — and this repository, which has both
  // capabilities live, printed them as `locked` and reported depth 2 of 5. The loot table's own
  // thesis is "loot that unlocks a real power is a mechanic"; a power that can never read as earned
  // is not a mechanic, it is a decoration that lies.
  const root = makeRepo(ADOPTED);
  try {
    const out = run(root);
    assert.doesNotMatch(out, /Merge-on-green\s+— locked/, "a reached-but-unobservable capability must not read as locked");
    assert.match(out, /Merge-on-green\s+—.*not visible from here/, "it must say it cannot be seen, and why");
    assert.doesNotMatch(out, /✦ Merge-on-green/, "and it must not read as earned either — unknown is not a pass");
    assert.match(out, /rest is repo settings/, "the ceiling on a local read must be stated, not implied by a stalled number");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("depth is not capped by steps nobody can observe", () => {
  // "npm run verify passed" is an EVENT and a pull request is REMOTE. Neither is written into a
  // working tree, and counting them as unfinished held the door shut on every later chamber.
  const steps = plan({
    filesWritten: true, installed: true, hooksLive: true, budgetsFrozen: true,
    budgetsAll: [], budgetsMissing: [], gatesWired: true, ledger: true, hasVerify: true,
  });
  const unobservable = steps.filter((s) => s.observable === false);
  assert.ok(unobservable.length >= 3, "the unobservable steps must be marked as such, not left to look unfinished");
  for (const s of unobservable) {
    assert.ok(s.cmd, `${s.title} must still tell the reader what to do — unobservable is not invisible`);
  }
  const observable = steps.filter((s) => s.observable !== false);
  assert.ok(observable.some((s) => s.done), "no observable step reports done for a fully-adopted repo — depth cannot move");
});

test("the two depth calculations agree, because they used to disagree", () => {
  // dungeon.mjs capped at 2 while the statusline reached 3 and said "rest is repo settings". The
  // statusline had the honest model all along. They are deliberately duplicated — the statusline is
  // copied into a target repo and must not import from the plugin — so the only thing that can hold
  // them together is a test that runs both.
  const root = makeRepo(ADOPTED);
  try {
    const crawl = Number(run(root).match(/depth (\d+) of 5/)?.[1]);
    const raw = execFileSync(process.execPath, [join(REPO, ".claude/harness-statusline.mjs")], {
      cwd: root, encoding: "utf8",
      input: JSON.stringify({ workspace: { current_dir: root } }),
      stdio: ["pipe", "pipe", "ignore"],
    });
    const status = Number(raw.replace(new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g"), "").match(/depth (\d+)/)?.[1]);
    assert.equal(crawl, status, `the crawl says depth ${crawl} and the statusline says ${status} for the same repo`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
