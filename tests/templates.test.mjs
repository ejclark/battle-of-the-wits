import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// `templates/` is the one directory every gate deliberately excludes — a template is source-shaped
// but is not this project's code, and measuring it inflates every number. Correct for the scanners,
// and the reason nothing could see that `common/claude/settings.json` was DEAD: never read by any
// module, and shipping a hook pointing at `.claude/hooks/intent-log.mjs`, a script this harness does
// not provide. An adopter reading it would reasonably believe there was an intent log.
//
// So the excluded directory gets its own gates, scoped by category rather than by a list.
const CORE = join(dirname(fileURLToPath(import.meta.url)), "../plugins/harness-core");
const TEMPLATES = join(CORE, "templates");

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const libSources = readdirSync(join(CORE, "lib"))
  .map((f) => readFileSync(join(CORE, "lib", f), "utf8"))
  .join("\n");

/**
 * Every template path the bootstrap actually loads, derived from its own `tpl(...)` calls.
 *
 * One of those calls is a template literal — `tpl(\`husky/${hook}\`)` — so an interpolated argument
 * contributes the literal PREFIX before the hole. Reading the loader rather than keeping a list is
 * the point: a list would have to be updated by the same person who forgot to wire the template in.
 */
function reachedPaths() {
  const out = [];
  for (const m of libSources.matchAll(/tpl\(\s*[`"']([^`"'$]*)(\$\{)?/g)) {
    out.push({ path: m[1], prefix: Boolean(m[2]) });
  }
  return out;
}

// Templates that are HANDED TO A PERSON rather than installed into a repository. The rule below is
// right — a template nothing writes is a promise to the adopter that nothing keeps — but it assumes
// every template is machine-written, and one is not: FIRST-APP.md is read by a human who has never
// built anything, and installing it into their repo would be the wrong verb entirely.
const HANDED_OVER = ["starter/FIRST-APP.md"];

// The starter app is written by `harness-starter`, not by the bootstrap — adopting the harness into
// an existing repository must never drop a to-do app into it. Reached by a different command is
// still reached; the rule is that nothing ships unreachable.
const WRITTEN_BY_STARTER = (rel) => rel.startsWith("starter/todo/") || rel.startsWith("starter/hello/");

test("every shipped template is reached by the bootstrap", () => {
  // A template nothing writes is dead weight that ships, and knip cannot see it here.
  const reached = reachedPaths();
  const orphans = walk(TEMPLATES)
    .map((f) => relative(TEMPLATES, f).split("\\").join("/"))
    .filter(
      (rel) =>
        // Either the loader names it directly, or its full path appears as a literal somewhere in
        // lib — `gateSpecFor` picks between two spec templates and hands the choice to `tpl()`.
        !reached.some((r) => (r.prefix ? rel.startsWith(r.path) : rel === r.path)) &&
        !libSources.includes(`"${rel}"`) &&
        !HANDED_OVER.includes(rel) &&
        !WRITTEN_BY_STARTER(rel),
    );
  assert.deepEqual(
    orphans,
    [],
    `templates nothing writes:\n  ${orphans.join("\n  ")}\n\n` +
      "Wire it into the bootstrap, or delete it. A template that ships and is never written is a\n" +
      "promise to the adopter that nothing keeps.",
  );
});

test("the two gate-spec templates defend the same dimensions", () => {
  // Which one an adopter gets is decided by their test runner. If they drift, half of all adopters
  // silently lose a gate — and the half is chosen by a property of their toolchain, which is the
  // least likely thing anyone would think to check.
  const gates = (file) => {
    const body = readFileSync(join(TEMPLATES, "specs", file), "utf8");
    return [...body.matchAll(/gate\("(harness-[\w-]+)"/g)].map((m) => m[1]).sort();
  };
  const forNodeTest = gates("gates.test.mjs");
  assert.ok(forNodeTest.length >= 6, "the parse found too few gates to be reading the file right");
  assert.deepEqual(gates("gates.spec.ts"), forNodeTest);
});

test("a hand-over template is still pointed at by something a reader will meet", () => {
  // The exemption above buys it out of the bootstrap, not out of being findable. A file nobody is
  // ever sent to is the same dead weight the rule was written for, arriving through the door the
  // exemption just opened.
  const pointers = [
    readFileSync(join(CORE, "../../CONTRIBUTING.md"), "utf8"),
    readFileSync(join(CORE, "skills/spark/SKILL.md"), "utf8"),
  ].join("\n");
  for (const rel of HANDED_OVER) {
    const leaf = rel.split("/").pop();
    assert.ok(pointers.includes(leaf), `${rel} is exempt from the bootstrap and nothing points at it either`);
  }

  // The starter's exemption is only honest while something actually writes it. A directory nobody
  // installs is the orphan the rule exists to catch, arriving through the door the exemption opened.
  const starterLib = readFileSync(join(CORE, "lib/starter.mjs"), "utf8");
  for (const kind of ["hello", "todo"]) {
    assert.match(starterLib, new RegExp(`templates/starter/${kind}`), `nothing writes the ${kind} starter — its exemption is now a hole`);
  }
});

test("no template names a path the harness does not ship", () => {
  // The dead reference that motivated this file: a hooks entry pointing at a script that does not
  // exist. `|| true` meant it failed silently, which is worse than failing.
  for (const f of walk(TEMPLATES)) {
    const body = readFileSync(f, "utf8");
    for (const m of body.matchAll(/\.claude\/hooks\/[\w.-]+/g)) {
      assert.fail(`${relative(TEMPLATES, f)} references ${m[0]}, which the bootstrap never writes`);
    }
  }
});
