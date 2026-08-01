#!/usr/bin/env node
// Incident fitness scan — the eye of the learning Coach.
//
// The dimension it watches: HOW LONG a process gap goes unrecognized. Every other eye looks at the
// code; this one looks at the *process*. Its debt number: incidents nobody has learned from yet.
//
// Signal: a failed workflow run on `main` (the ground truth for "a gap escaped every net"). An
// incident is CLOSED when docs/LESSONS.md carries an entry naming its commit sha. The budget only
// ratchets DOWN and practically lives at 0: run `/retro`, land the lesson, back to zero.
//
//   harness-incident-scan              # report + enforce (exit 1 if incidents are unlearned)
//   harness-incident-scan --update     # rewrite incident-budget.json (ratchet: only lower)
//   harness-incident-scan --candidate  # the oldest unlearned incident as JSON
//   harness-incident-scan --days 14    # lookback window (default 14)
//
// Resource doctrine (docs/COACHES.md): REST *core* bucket only — one request, no polling, no
// GraphQL. Degrades to a clean no-op with no token or network, so it never becomes a flaky gate.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { descriptor, readBudget, writeBudget } from "./descriptor.mjs";

const ROOT = process.cwd();
// Descriptor, budget I/O, tree walk and repo-relative paths come from descriptor.mjs — one
// behaviour, not six copies. A `bin/` launcher runs `node lib/<x>.mjs`, so a sibling import is an
// ordinary relative specifier; the "standalone executables must not import" rule was never true.
const DESC = descriptor(ROOT);
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
      "User-Agent": "dungeon-crawler-harness",
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

// No ledger yet = nothing to audit, the same grandfather posture as the budget below. Crashing here
// would fail the gate at the one moment it must not: the first run in a repo that has not adopted it.
const ledger = existsSync(LEDGER_FILE) ? readFileSync(LEDGER_FILE, "utf8") : "";
/** An incident is learned-from once the ledger names its sha on a `**SHA:**` line. */
const isLearned = (sha) => new RegExp(`\\*\\*SHA:\\*\\*\\s*\`?${sha}`).test(ledger);

// Grandfather like every other gate: with no committed budget, freeze whatever exists rather than
// blocking. This was the one scanner that assumed its budget file was already there, so it crashed
// with ENOENT on a repo adopting the harness for the first time — the exact moment it must not.
const budget = readBudget(ROOT, "incident", { unlearnedIncidents: Number.POSITIVE_INFINITY });

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

  // --candidate is a MACHINE contract: exactly one JSON object on stdout, always. Every diagnostic
  // below goes to stderr in that mode, and every early return still emits the object — an athlete
  // parsing stdout would otherwise take a SyntaxError on its very first command, offline.
  const note = (msg) => (flag("--candidate") ? console.error(msg) : console.log(msg));
  const bail = () => (flag("--candidate") ? console.log(JSON.stringify({ candidate: null, debt: 0 }, null, 2)) : undefined);

  if (!token) {
    note("incident-scan: no GH_TOKEN/GITHUB_TOKEN — skipping the remote half (offline no-op).");
    bail();
    return 0;
  }

  let runs;
  try {
    runs = await failedMainRuns();
  } catch (err) {
    note(`incident-scan: could not reach GitHub (${err.message}) — skipping (offline no-op).`);
    bail();
    return 0;
  }

  // One incident per commit: a re-run of the same sha is the same gap, not a new one.
  const bySha = new Map();
  for (const run of runs) if (run.sha && !bySha.has(run.sha)) bySha.set(run.sha, run);
  const unlearned = [...bySha.values()].filter((r) => !isLearned(r.sha));

  if (flag("--candidate")) {
    const oldest = unlearned.sort((a, b) => a.date.localeCompare(b.date))[0];
    console.log(JSON.stringify({ candidate: oldest ?? null, debt: unlearned.length }, null, 2));
    return 0;
  }

  note(`incident-scan: ${bySha.size} failed run(s) on main in the last ${days}d`);
  for (const r of unlearned) note(`  UNLEARNED  ${r.sha}  ${r.date}  ${r.name}  ${r.title}`);

  if (flag("--update")) {
    const next = Math.min(budget.unlearnedIncidents, unlearned.length);
    writeBudget(ROOT, "incident", { unlearnedIncidents: next });
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
