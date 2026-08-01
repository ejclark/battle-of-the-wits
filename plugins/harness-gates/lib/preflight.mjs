#!/usr/bin/env node
// BLAST-RADIUS PREFLIGHT — make the irreversible class unreachable rather than discouraged.
//
//   harness-preflight                  # check the working tree against the base branch
//   harness-preflight --agent <id>     # also require the diff to stay inside claimed territory
//   harness-preflight --base <ref>     # compare against something other than the default branch
//
// Until now "PRs only, never touch workflow files or credentials" was PROSE IN A DOCUMENT, and prose
// does not stop an agent. It stops a careful reader. An autonomous athlete is neither careful nor a
// reader — it is a process that will do whatever its diff contains, so the rule has to be a gate.
//
// The four things it refuses, and why each is the irreversible class rather than a style preference:
//
//   1. WORKFLOW FILES. `.github/workflows/**` decides what runs with the repository's credentials.
//      An agent that can edit CI can grant itself anything else, so this is the one that makes every
//      other rail moot if it leaks.
//   2. CREDENTIAL-SHAPED FILES. Keys, certs, .env. A committed secret cannot be un-leaked by a
//      revert — rotation is the only remedy, and it is somebody's afternoon.
//   3. RAISING A BUDGET. Athletes exist to ratchet debt DOWN. An athlete that can raise its own
//      budget can mark its own homework, which quietly converts every gate into decoration.
//   4. WORKING ON THE DEFAULT BRANCH. Committing straight to main skips review entirely, which is
//      the whole mechanism.
//
// With --agent it also enforces territory: the diff must stay inside what that athlete claimed. That
// is what turns claims from advisory into binding — a claim nobody checks is a comment.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

function defaultBranch() {
  for (const guess of ["origin/HEAD", "origin/main", "main", "master"]) {
    try {
      return git(["rev-parse", "--abbrev-ref", guess]).replace(/^origin\//, "");
    } catch {
      /* try the next */
    }
  }
  return "main";
}

/**
 * Every file this change touches — committed, staged, modified, AND UNTRACKED.
 *
 * The untracked source is not an afterthought: `git diff` does not report a file that has never been
 * added, so a preflight built on diff alone waves through exactly the dangerous case — an athlete
 * CREATING .github/workflows/evil.yml rather than editing one. Found by testing the refusal instead
 * of trusting it.
 */
function changedFiles(base) {
  const out = new Set();
  for (const args of [
    ["diff", "--name-only", `${base}...HEAD`],
    ["diff", "--name-only"],
    ["diff", "--name-only", "--cached"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    try {
      for (const f of git(args).split("\n")) if (f) out.add(f);
    } catch {
      /* no such ref yet — the other sources still apply */
    }
  }
  // .harness/ is runtime coordination state — the claims registry itself. It is never part of a
  // change, and counting it would have every athlete fail its own territory check.
  return [...out].filter((f) => !f.startsWith(".harness/"));
}

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
const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : defaultBranch();

const violations = [];

// 4 — never on the default branch.
let branch = "";
try {
  branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
} catch {
  /* unborn repo */
}
if (branch && branch === base) {
  violations.push(`working directly on ${base} — every change must arrive as a pull request`);
}

// Named `touched` rather than `files`: the duplication gate flagged a third module with a local
// `files`. Three variables that happen to share a generic name are a coincidence, not an abstraction.
const touched = changedFiles(base);

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

if (violations.length) {
  console.error("\n✗ PREFLIGHT REFUSED — this change reaches further than an athlete may:\n");
  for (const v of violations) console.error(`    ${v}`);
  console.error(`
  These are not style preferences. Each one is either irreversible, or it disables the
  mechanism that makes autonomy safe. Hand the change to a human rather than working around it.
`);
  process.exit(1);
}

console.log(`✓ preflight clear — ${touched.length} file(s), nothing outside the safe radius`);
