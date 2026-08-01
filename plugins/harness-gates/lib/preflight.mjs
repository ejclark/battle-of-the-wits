#!/usr/bin/env node
// BLAST-RADIUS PREFLIGHT — make the irreversible class unreachable rather than discouraged.
//
//   harness-preflight                  # check the working tree against the base branch
//   harness-preflight --agent <id>     # also require the diff to stay inside claimed territory
//   harness-preflight --as <id>        # also require the diff to stay inside a principal's zoning
//   harness-preflight --base <ref>     # compare against something other than the default branch
//
// "PRs only, never touch workflow files or credentials" as prose stops a careful reader. An
// autonomous athlete is a process that does whatever its diff contains, so the rule has to be a gate.
//
// The four things it refuses, and why each is the irreversible class rather than a style preference:
//
//   1. WORKFLOW FILES. `.github/workflows/**` decides what runs with the repo's credentials. An
//      agent that can edit CI can grant itself anything else — this one makes every other rail moot.
//   2. CREDENTIAL-SHAPED FILES. Keys, certs, .env. A committed secret cannot be un-leaked by a
//      revert — rotation is the only remedy.
//   3. RAISING A BUDGET. Athletes ratchet debt DOWN. One that can raise its own budget marks its
//      own homework, which quietly converts every gate into decoration.
//   4. WORKING ON THE DEFAULT BRANCH. Committing straight to main skips review, the whole mechanism.
//
// With --agent it also enforces territory: a claim nobody checks is a comment.
//
// With --as it enforces ZONING — the radius a named principal may write in. Territory and zoning are
// different questions and both are needed: territory is "is anyone else working here right now",
// zoning is "is this person allowed to work here at all". An athlete answers the first because its
// behaviour is fixed by a contract; a human answers the second because theirs is not.
//
// Both are INTERSECTIONS with the four refusals above, never exemptions from them. Nothing a caller
// can pass on the command line widens what this tool permits — the only directions available are
// "as strict" and "stricter". A flag that unlocked something would make every refusal here advisory.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { changedFiles, currentBranch, defaultBranch } from "./gitscope.mjs";
import { zoningViolations } from "./principals.mjs";

const REPO = process.cwd();

const FORBIDDEN = [
  { re: /^\.github\/workflows\//, why: "workflow files decide what runs with the repo's credentials" },
  { re: /(^|\/)\.env(\.|$)/, why: "environment files carry secrets" },
  { re: /\.(pem|key|p12|pfx|keystore)$/, why: "private key material" },
  { re: /(^|\/)(secrets?|credentials?)(\.|\/|$)/i, why: "credential material" },
  { re: /(^|\/)\.git\/config$/, why: "git config controls remotes and credential helpers" },
  { re: /(^|\/)\.claude\/settings(\.local)?\.json$/, why: "settings define hooks, which are code execution" },
];

const git = (args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** A budget may only ever move DOWN. Raising one is an athlete marking its own homework. */
function raisedBudgets(base, touched) {
  const raised = [];
  for (const f of touched.filter((x) => /-budget\.json$/.test(x))) {
    let before;
    try {
      before = JSON.parse(git(["show", `${base}:${f}`]));
    } catch {
      continue; // new budget file — freezing for the first time is legitimate
    }
    if (!existsSync(join(REPO, f))) continue;
    const after = JSON.parse(readFileSync(join(REPO, f), "utf8"));
    for (const [k, v] of Object.entries(after)) {
      if (typeof v !== "number" || typeof before[k] !== "number") continue;
      if (v > before[k]) raised.push(`${f} → ${k}: ${before[k]} → ${v}`);
    }
  }
  return raised;
}

function claimedPaths(agent) {
  try {
    const claims = JSON.parse(readFileSync(join(REPO, ".harness/claims.json"), "utf8"));
    return (claims.find((c) => c.agent === agent) ?? {}).paths ?? null;
  } catch {
    return null;
  }
}

const argv = process.argv.slice(2);
const agent = argv.includes("--agent") ? argv[argv.indexOf("--agent") + 1] : null;
const principalId = argv.includes("--as") ? argv[argv.indexOf("--as") + 1] : null;
const fallback = defaultBranch(REPO);
const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : fallback.ref;
const defaultName = argv.includes("--base") ? base.replace(/^origin\//, "") : fallback.name;

const violations = [];

// 4 — never on the default branch.
const branch = currentBranch(REPO);
if (branch && branch === defaultName) {
  violations.push(`working directly on ${defaultName} — every change must arrive as a pull request`);
}

// Named `touched` rather than `files`: the duplication gate flagged a third module with a local
// `files`. Three variables that happen to share a generic name are a coincidence, not an abstraction.
const touched = changedFiles(REPO, base);

// 1 & 2 — forbidden paths.
for (const f of touched) {
  for (const rule of FORBIDDEN) {
    if (rule.re.test(f)) violations.push(`${f} — ${rule.why}`);
  }
}

// 3 — budgets only ratchet down.
for (const r of raisedBudgets(base, touched)) {
  violations.push(`${r} — a budget may only be lowered; raising one is marking your own homework`);
}

// 5 — territory, when an agent is named.
if (agent) {
  const claimed = claimedPaths(agent);
  if (!claimed) {
    violations.push(`${agent} holds no territory — claim before you edit (harness-claim ${agent} <path>...)`);
  } else {
    const outside = touched.filter((f) => !claimed.some((p) => f === p || f.startsWith(`${p}/`)));
    for (const f of outside) violations.push(`${f} — outside the territory ${agent} claimed`);
  }
}

// 6 — zoning, when a principal is named. Fails closed on an unknown one: see `zoningViolations`.
if (principalId) violations.push(...zoningViolations(REPO, principalId, touched));

const who = principalId ?? agent ?? "this change";
if (violations.length) {
  console.error(`\n✗ PREFLIGHT REFUSED — ${who} reached further than the safe radius:\n`);
  for (const v of violations) console.error(`    ${v}`);
  console.error(`
  These are not style preferences. Each one is either irreversible, or it disables the
  mechanism that makes autonomy safe.

  What to do — pick the one that matches:
    · A file listed above does not belong in this change → drop it, and re-run.
    · It DOES belong, and you are not the right person to land it → say so and hand it over.
      That is the designed outcome, not a failure, and nobody has to justify hitting this.
    · The radius itself looks wrong → that is a real finding worth raising. Raise it; do not
      route around it. A rail that gets quietly bypassed once is a rail nobody can trust again.
`);
  process.exit(1);
}

console.log(`✓ preflight clear vs ${base} — ${touched.length} file(s), nothing outside the safe radius`);
