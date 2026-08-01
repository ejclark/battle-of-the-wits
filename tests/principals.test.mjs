// The zoning table and the standing model, tested where they are easiest to get quietly wrong.
//
// Three failure classes drive every case below, and all three PASS a naive test:
//
//   · A radius derived from a hardcoded path. In a repository laid out as `lib/` + `spec/`, a table
//     that says `src/` admits nothing and refuses nothing. It does not throw. It reports clear.
//   · A permission check that fails OPEN. An unknown principal, a missing roster, a corrupt file —
//     each is a state where "permit" and "refuse" are both plausible implementations, and only one
//     of them is safe. A check that permits what it never evaluated is worse than no check.
//   · A tier order that is not actually an order. Cumulative tiers are written as a list of
//     predicates, and nothing about that shape prevents a higher tier from admitting less than a
//     lower one. The bug is invisible on inspection and obvious under a test.
//
// Standing gets the same treatment: the evidence functions are asserted against a REAL git history
// with a REAL revert in it, because "counts commits" and "counts commits that survived" differ only
// on a history where something was taken back.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  TIERS,
  atLeast,
  defaultRef,
  eligibility,
  evidenceFor,
  outsideRadius,
  ratchetDelta,
  roster,
  rosterState,
  zoning,
  zoningViolations,
} from "../plugins/harness-gates/lib/principals.mjs";
import { makeGitRepo, makeRepo } from "./helpers.mjs";

/** The non-default layout the portability suite uses. Nothing here may be true only of `src/`. */
const LIFTED = { sourceDir: "lib", testDir: "spec", docsDir: "documentation", ideasFile: "documentation/BACKLOG.md" };

const admits = (tier, file, desc) => outsideRadius(tier, [file], desc).length === 0;

test("the radius comes from the descriptor, not from a hardcoded layout", () => {
  // The planted-violation shape, at unit scale: a table that said `src/` would refuse `lib/thing.ts`
  // to a builder and permit nothing — passing every "does it refuse?" assertion for the wrong reason.
  assert.ok(admits("builder", "lib/thing.ts", LIFTED), "builder must reach the declared sourceDir");
  assert.ok(admits("contributor", "spec/thing.test.ts", LIFTED), "contributor must reach the declared testDir");
  assert.ok(admits("contributor", "documentation/guide.md", LIFTED), "contributor must reach the declared docsDir");
  assert.ok(admits("contributor", "documentation/BACKLOG.md", LIFTED), "contributor must reach the declared idea log");

  // …and the defaults must NOT leak in once a descriptor has spoken.
  assert.ok(!admits("builder", "src/thing.ts", LIFTED), "src/ is not this repo's source dir");
  assert.ok(!admits("contributor", "tests/thing.test.ts", LIFTED), "tests/ is not this repo's test dir");
});

test("tiers are cumulative — no tier admits less than the one below it", () => {
  // Written as a property rather than a table of expectations: a cumulative list built by hand is
  // exactly the thing that develops a hole when someone reorders an increment.
  const probes = [
    "documentation/guide.md",
    "documentation/BACKLOG.md",
    "README.md",
    "spec/thing.test.ts",
    "lib/thing.ts",
    "arch-budget.json",
    "harness.json",
  ];
  for (let i = 1; i < TIERS.length; i++) {
    for (const f of probes) {
      if (admits(TIERS[i - 1], f, LIFTED)) {
        assert.ok(admits(TIERS[i], f, LIFTED), `${TIERS[i]} must admit everything ${TIERS[i - 1]} does (${f})`);
      }
    }
  }
});

test("visitor writes nothing, and owner writes anything the preflight allows", () => {
  for (const f of ["documentation/guide.md", "README.md", "lib/thing.ts", "arch-budget.json"]) {
    assert.ok(!admits("visitor", f, LIFTED), `visitor must not write ${f}`);
    assert.ok(admits("owner", f, LIFTED), `owner must be able to write ${f}`);
  }
});

test("budgets and toolchain config are steward-only", () => {
  for (const f of ["arch-budget.json", "dupe-budget.json", "harness.json", "knip.json", "biome.json"]) {
    assert.ok(!admits("builder", f, LIFTED), `${f} must be above the builder radius`);
    assert.ok(admits("steward", f, LIFTED), `${f} must be inside the steward radius`);
  }
});

test("an unknown tier admits nothing — the check fails closed", () => {
  const out = outsideRadius("archmage", ["README.md"], LIFTED);
  assert.equal(out.length, 1, "an unrecognised tier must refuse, never wave through");
  assert.match(out[0], /unknown tier/, "and must say WHY, so a typo is diagnosable");
});

test("zoning still answers with no descriptor at all", () => {
  // Documented defaults, never inference. A repo with no harness.json is the common case.
  const table = zoning(undefined);
  assert.deepEqual(
    table.map((z) => z.tier),
    TIERS,
    "the default table must still be the full, ordered ladder",
  );
});

test("atLeast implements the ladder order, and rejects a name that is not on it", () => {
  assert.ok(atLeast("steward", "builder"));
  assert.ok(atLeast("builder", "builder"));
  assert.ok(!atLeast("contributor", "builder"));
  assert.ok(!atLeast("archmage", "visitor"), "an unknown tier is never 'at least' anything");
});

test("a missing roster reads as empty, and a corrupt one does not wedge the tool", () => {
  assert.deepEqual(roster(makeRepo({})), [], "no roster is the normal case, not an error");

  const broken = makeRepo({ ".harness/roster.json": "{ not json" });
  assert.deepEqual(roster(broken), [], "a permission file that can brick the tool is the worse failure");

  const shaped = makeRepo({ ".harness/roster.json": JSON.stringify({ principals: [{ id: "a" }, { nope: 1 }] }) });
  assert.deepEqual(
    roster(shaped).map((p) => p.id),
    ["a"],
    "both the array and the {principals:[…]} shape are accepted; entries without an id are not",
  );
});

test("a roster git would commit is refused, not read", () => {
  // The hole this closes was live in every ADOPTER, not here. `.harness/` reaches their .gitignore
  // only through harness-bootstrap, and installing the plugins does not run it — so the harness was
  // treating a property of its own repository as a property of theirs.
  const { root } = makeGitRepo({ "README.md": "x\n" });
  mkdirSync(join(root, ".harness"), { recursive: true });
  writeFileSync(join(root, ".harness/roster.json"), JSON.stringify([{ id: "someone", tier: "owner" }]));

  const exposedState = rosterState(root);
  assert.equal(exposedState.state, "exposed", "not-ignored must be distinguishable from absent");
  assert.deepEqual(exposedState.principals, [], "and must yield nothing — refusing to read is the safe direction");

  writeFileSync(join(root, ".gitignore"), ".harness/\n");
  assert.equal(rosterState(root).state, "ok", "once ignored, it reads normally");
  assert.equal(rosterState(root).principals.length, 1);
});

test("the roster schema is closed — a free-text note about a person cannot survive the read", () => {
  // You cannot leak a field that no code reads. A `note:` written in good faith to help calibrate is
  // exactly the shape the dignity rule cannot survive, so it is discarded structurally rather than
  // forbidden by instruction.
  const root = makeRepo({
    ".harness/roster.json": JSON.stringify([
      { id: "a", kind: "human", tier: "builder", identities: ["a@example.invalid"], note: "shaky on branches", realName: "A Person" },
    ]),
  });
  const [p] = roster(root);
  assert.deepEqual(Object.keys(p).sort(), ["id", "identities", "kind", "tier"]);
  assert.equal(p.note, undefined);
  assert.equal(p.realName, undefined);
});

test("an unknown principal is refused everything — zoning fails closed", () => {
  const root = makeRepo({ ".harness/roster.json": JSON.stringify([{ id: "known", tier: "owner" }]) });
  const out = zoningViolations(root, "stranger", ["README.md"]);
  assert.equal(out.length, 1);
  assert.match(out[0], /no principal "stranger"/);
  assert.match(out[0], /nothing is permitted/, "the message must state the fail-closed rule, not imply it");
  assert.deepEqual(zoningViolations(root, "known", ["README.md"]), [], "a known owner passes");
});

test("a principal with no explicit tier is treated as a visitor", () => {
  const root = makeRepo({ ".harness/roster.json": JSON.stringify([{ id: "new" }]) });
  assert.equal(zoningViolations(root, "new", ["README.md"]).length, 1, "absent tier must not mean unrestricted");
});

// ── Standing ───────────────────────────────────────────────────────────────────────────────────

test("evidence counts what shipped and subtracts what was taken back", () => {
  const { root, git } = makeGitRepo({ "a.txt": "one\n" });
  writeFileSync(join(root, "b.txt"), "two\n");
  git("add", "-A");
  git("commit", "-qm", "second");
  const doomed = git("rev-parse", "HEAD").trim();
  git("revert", "--no-edit", doomed);

  const me = { id: "probe", identities: ["probe@example.com"] };
  const ev = evidenceFor(root, me, "HEAD");

  assert.equal(ev.measurable, true);
  assert.equal(ev.landed, 3, "init + second + the revert commit itself all landed");
  assert.equal(ev.reverted, 1, "the reverted commit must be detected from the revert message");
  assert.equal(ev.survived, 2, "survived is the number eligibility reads — landed minus reverted");
});

test("a principal with no git identity measures as zero rather than erroring", () => {
  const { root } = makeGitRepo();
  const ev = evidenceFor(root, { id: "newcomer" }, "HEAD");
  assert.equal(ev.survived, 0);
  assert.equal(ev.measurable, true, "the repo IS measurable; this person simply has no history in it");
});

test("standing degrades honestly where there is no history to read", () => {
  const bare = makeRepo({ "a.txt": "x\n" }); // not a git repository at all
  assert.equal(defaultRef(bare), null, "no ref must be reported as null, never guessed");
  const ev = evidenceFor(bare, { id: "x", identities: ["x@example.com"] });
  assert.equal(ev.measurable, false, "cannot-measure is a distinct state from measured-zero");
  assert.equal(eligibility(ev).tier, null, "and it must not render a verdict in either direction");
});

test("the ratchet signal counts reductions and ignores raises", () => {
  const { root, git } = makeGitRepo({ "arch-budget.json": JSON.stringify({ "lib/a.ts": 100, "lib/b.ts": 50 }, null, 2) });

  writeFileSync(join(root, "arch-budget.json"), JSON.stringify({ "lib/a.ts": 60, "lib/b.ts": 50 }, null, 2));
  git("add", "-A");
  git("commit", "-qm", "lower a");
  const lowered = git("rev-parse", "HEAD").trim();

  writeFileSync(join(root, "arch-budget.json"), JSON.stringify({ "lib/a.ts": 60, "lib/b.ts": 400 }, null, 2));
  git("add", "-A");
  git("commit", "-qm", "raise b");
  const raised = git("rev-parse", "HEAD").trim();

  assert.equal(ratchetDelta(root, [lowered]), 40, "100 → 60 is 40 lines of retired debt");
  assert.equal(ratchetDelta(root, [raised]), 0, "a raise contributes zero, never a negative");
  assert.equal(ratchetDelta(root, [lowered, raised]), 40, "and a raise cannot cancel someone's reduction");
});

test("eligibility is a floor, is never a promotion, and says so where there is nothing to say", () => {
  const at = (survived, ratcheted = 0) => eligibility({ measurable: true, survived, ratcheted, landed: survived, reverted: 0 });
  assert.equal(at(0).tier, "visitor");
  assert.equal(at(1).tier, "contributor");
  assert.equal(at(5).tier, "builder");
  assert.equal(at(12).tier, "builder", "volume alone must never reach steward");
  assert.equal(at(12, 30).tier, "steward", "steward needs retired debt, which volume cannot manufacture");

  // The starting position must not read as a judgement — a new contributor will read this string.
  assert.match(at(0).why, /not a judgement/);
});
