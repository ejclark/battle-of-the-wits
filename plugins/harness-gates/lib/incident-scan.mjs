#!/usr/bin/env node
// Incident fitness scan — the eye of the learning Coach.
//
// The dimension it watches: HOW LONG a process gap goes unrecognized. The motivating failure is
// recorded in docs/LESSONS.md — branch protection silently broke `deploy` and nobody noticed for
// four merges, because nothing in the system watches a red `main`. Every other eye looks at the
// code; this one looks at the *process*, and its debt number is "incidents nobody has learned from
// yet."
//
// Signal: a failed workflow run on `main` (the ground truth for "a gap escaped every net"). An
// incident is CLOSED when docs/LESSONS.md carries an entry naming its commit sha. The budget is
// the count of un-retro'd incidents and only ever ratchets DOWN — practically, it lives at 0: run
// `/retro` on the finding, land the lesson, and the number returns to zero.
//
//   node scripts/incident-scan.mjs             # report + enforce (exit 1 if incidents are unlearned)
//   node scripts/incident-scan.mjs --update    # rewrite incident-budget.json (ratchet: only lower)
//   node scripts/incident-scan.mjs --candidate # the oldest unlearned incident as JSON
//   node scripts/incident-scan.mjs --days 14   # lookback window (default 14)
//
// Resource doctrine (docs/COACHES.md): REST *core* bucket only — one request, no polling, no
// GraphQL. Degrades to a clean no-op (exit 0) with no token or no network, so it never becomes a
// flaky gate; the ledger's own well-formedness is enforced offline by tests/arch/lessons.spec.ts.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
// --- capability descriptor -------------------------------------------------
// The harness is repo-agnostic: every path it scans comes from harness.json at
// the target repo root, never from an assumption about layout. Missing file =
// the documented defaults, so a conventional repo needs no config at all.
const DESC = (() => {
  const d = { sourceDir: "src", testDir: "tests", specSuffix: ".spec.ts", sourceExt: ".ts" };
  try { Object.assign(d, JSON.parse(readFileSync(join(ROOT, "harness.json"), "utf8"))); } catch {}
  return d;
})();
const BUDGET_FILE = join(ROOT, "incident-budget.json");
const LEDGER_FILE = join(ROOT, "docs/LESSONS.md");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const days = Number(args[args.indexOf("--days") + 1]) || 14;

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

/** owner/repo from the origin remote, handling the proxy URL form (…/git/OWNER/REPO). */
function repoSlug() {
  const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" })
    .trim()
    .replace(/\.git$/, "");
  if (url.includes("/git/")) return url.slice(url.lastIndexOf("/git/") + 5);
  return url.replace(/^[a-z]+:\/\/[^/]+\//, "").replace(/^git@[^:]+:/, "");
}

/** Failed workflow runs on `main` within the lookback window. */
async function failedMainRuns() {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const url =
    `https://api.github.com/repos/${repoSlug()}/actions/runs` +
    `?branch=main&status=failure&per_page=50&created=%3E%3D${since}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "battle-of-the-wits-harness",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const body = await res.json();
  return (body.workflow_runs ?? []).map((r) => ({
    id: r.id,
    sha: (r.head_sha ?? "").slice(0, 7),
    name: r.name,
    date: (r.created_at ?? "").slice(0, 10),
    title: (r.display_title ?? "").split("\n")[0],
    url: r.html_url,
  }));
}

const ledger = readFileSync(LEDGER_FILE, "utf8");
/** An incident is learned-from once the ledger names its sha on a `**SHA:**` line. */
const isLearned = (sha) => new RegExp(`\\*\\*SHA:\\*\\*\\s*\`?${sha}`).test(ledger);

const budget = JSON.parse(readFileSync(BUDGET_FILE, "utf8"));

const FIELDS = ["SHA", "DATE", "STATUS", "SIGNAL", "ROOT CAUSE", "PREVENTION", "SIDE QUESTS"];

/**
 * The offline half of the eye: the ledger itself must be well-formed and carry no open entries.
 * A lesson missing its PREVENTION line is a war story, not a lesson — it changes nothing about
 * the next session. Runs with no network and no token, which is why it is the part CI enforces.
 */
function auditLedger() {
  const entries = ledger.split(/^### /m).slice(1);
  const problems = [];
  for (const entry of entries) {
    const title = entry.split("\n")[0].trim();
    for (const field of FIELDS) {
      if (!entry.includes(`**${field}:**`)) problems.push(`"${title}" is missing **${field}:**`);
    }
    if (/\*\*STATUS:\*\*\s*open/i.test(entry)) problems.push(`"${title}" is still STATUS: open`);
  }
  return problems;
}

async function main() {
  const problems = auditLedger();
  if (problems.length > 0) {
    console.error("incident-scan: docs/LESSONS.md is not well-formed:");
    for (const p of problems) console.error(`  - ${p}`);
    return 1;
  }

  if (!token) {
    console.log(
      "incident-scan: no GH_TOKEN/GITHUB_TOKEN — skipping the remote half (offline no-op).",
    );
    return 0;
  }

  let runs;
  try {
    runs = await failedMainRuns();
  } catch (err) {
    console.log(
      `incident-scan: could not reach GitHub (${err.message}) — skipping (offline no-op).`,
    );
    return 0;
  }

  // One incident per commit: a re-run of the same sha is the same gap, not a new one.
  const bySha = new Map();
  for (const run of runs) if (run.sha && !bySha.has(run.sha)) bySha.set(run.sha, run);
  const unlearned = [...bySha.values()].filter((r) => !isLearned(r.sha));

  if (flag("--candidate")) {
    const oldest = unlearned.sort((a, b) => a.date.localeCompare(b.date))[0];
    console.log(JSON.stringify(oldest ?? null));
    return 0;
  }

  console.log(`incident-scan: ${bySha.size} failed run(s) on main in the last ${days}d`);
  for (const r of unlearned) console.log(`  UNLEARNED  ${r.sha}  ${r.date}  ${r.name}  ${r.title}`);

  if (flag("--update")) {
    const next = Math.min(budget.unlearnedIncidents, unlearned.length);
    writeFileSync(BUDGET_FILE, `${JSON.stringify({ unlearnedIncidents: next }, null, 2)}\n`);
    console.log(`incident-scan: budget ratcheted to ${next}`);
    return 0;
  }

  if (unlearned.length > budget.unlearnedIncidents) {
    console.error(
      `\nincident-scan: ${unlearned.length} unlearned incident(s) exceeds the budget of ` +
        `${budget.unlearnedIncidents}.\nRun the /retro drill on the oldest one and record the ` +
        `lesson in docs/LESSONS.md — an incident is not closed until it has taught us something.`,
    );
    return 1;
  }
  console.log("incident-scan: every incident on main has a lesson. ✅");
  return 0;
}

process.exit(await main());
