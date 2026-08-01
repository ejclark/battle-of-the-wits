#!/usr/bin/env node
// AM I WORKING ON THE LATEST? — answered at session start, before it costs anything.
//
//   harness-freshness            # one line if behind, SILENCE if current
//   harness-freshness --json     # for a caller
//
// THE PROBLEM, and it is the one a new contributor is least equipped to notice. Someone opens a
// session, works for two hours, and the base moved forty minutes in. Nothing tells them. They fix a
// thing already fixed, hit a defect already patched, or write against a doc that has since changed —
// and the failure is silent, because a stale checkout looks exactly like a current one.
//
// This is the divergence-over-time cost that makes long-lived branches expensive, arriving at a
// PERSON instead of a branch. Same clock, same fix: measure the gap and say it out loud.
//
// TWO INDEPENDENT CLOCKS, and reporting one is worse than reporting neither, because it produces
// confidence about a question it did not ask:
//
//   1. THE CHECKOUT — how far `origin/<default>` has moved past what is on disk. Ordinary git.
//   2. THE INSTALLED PLUGINS — SHA-tracked with no version field, so they update through
//      `/plugin update` on a completely separate schedule from any repository. Working *inside* the
//      marketplace repo collapses the two into one clock; working anywhere else does not.
//
// COST DISCIPLINE. This runs on every session start, so it obeys two rules absolutely:
//
//   · SILENT WHEN CURRENT. A hook that prints "you are up to date" on every session has taught
//     everyone to skip its output by the third day, which is the day it finally matters.
//   · NO NETWORK BY DEFAULT. `git fetch` on every session start is latency the person pays and a
//     round trip they did not ask for. This reads refs already on disk; `--fetch` opts in.
//
// Both make it nearly free in tokens, which is the point — a freshness check that costs an adopter
// anything measurable will be turned off, and then it protects nobody.
// WHY THIS LIVES IN harness-gates RATHER THAN harness-core: it needs `defaultBranch`, and the
// duplication gate caught the first draft re-implementing it one plugin over. That was not a naming
// collision — gitscope's version carries a fix for a bug this one had already re-introduced:
// conflating the branch NAME with the REF every comparison is taken against, so the comparison
// silently ran against a stale LOCAL branch. Two answers to "what is the default branch" can
// diverge, which is the only cost duplication still has, and it is the expensive one.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { defaultBranch } from "./gitscope.mjs";

/** Never throws: not a repo, no remote, detached — all data, none of it an error. */
const gitLine = (root, args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

/**
 * How far behind the checkout is, and whether the plugin clock is the same one.
 *
 * `behind` is null whenever it CANNOT be determined — no remote, no ref, not a repo. That is
 * deliberately distinct from 0: a gate that cannot measure must not render a verdict, and "we could
 * not check" is the honest answer a fresh clone with no upstream deserves.
 */
export function freshness(root, { fetch = false } = {}) {
  if (!existsSync(join(root, ".git"))) return { behind: null, why: "not a git repository", branch: null, sameClock: null };

  // `.ref` rather than `.name`, deliberately — the ref is what a comparison must be taken against,
  // and it falls back to the local branch when there is no remote instead of inventing one.
  const { name, ref } = defaultBranch(root);
  if (fetch) gitLine(root, ["fetch", "--quiet", "origin", name]);

  const count = gitLine(root, ["rev-list", "--count", `HEAD..${ref}`]);
  const behind = count === null || count === "" ? null : Number(count);

  // Is the plugin source the repository being worked in? If so one `git pull` moves both clocks and
  // there is one thing to say. If not, the plugins update through `/plugin update` on a schedule
  // nothing here can see — and claiming otherwise is the false confidence this exists to prevent.
  const remote = gitLine(root, ["config", "--get", "remote.origin.url"]) ?? "";
  const sameClock = /dungeon-crawler(\.git)?\/?$/.test(remote);

  return {
    behind: Number.isFinite(behind) ? behind : null,
    why: behind === null ? `no local ref for ${ref} — run with --fetch` : null,
    branch: name,
    sameClock,
    stale: Number.isFinite(behind) && behind > 0,
  };
}

/** The line. Empty string means say nothing, which is most of the time and is the design. */
export function freshnessLine(f) {
  if (!f.stale) return "";
  const n = f.behind;
  const plural = n === 1 ? "commit" : "commits";
  const pull = `git pull origin ${f.branch}`;
  return f.sameClock
    ? `⟳ ${n} ${plural} behind origin/${f.branch} — the harness and this repo are the same thing here, so \`${pull}\` updates both.`
    : `⟳ ${n} ${plural} behind origin/${f.branch} — \`${pull}\`. The harness plugins track separately; \`/plugin update\` is the other half.`;
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("freshness.mjs")) {
  const f = freshness(process.cwd(), { fetch: process.argv.includes("--fetch") });
  if (process.argv.includes("--json")) console.log(JSON.stringify(f, null, 2));
  else {
    const line = freshnessLine(f);
    if (line) console.log(line);
  }
  // ALWAYS exit 0. This is information, never a verdict — a session-start hook that can fail is a
  // session that can fail to start, which is a far worse outcome than a stale checkout.
  process.exit(0);
}
