import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// THE REPOSITORY'S NAME IS AN INTEGRATION POINT, and it was the one nothing checked.
//
// This repo was renamed mid-flight. Git redirects, so every push kept working and nothing looked
// wrong — while `package.json`'s repository URL, the marketplace name in the install command, both
// plugin manifests, and a dozen doc links all still named the old repo. The first thing to actually
// break was `semantic-release`, on `main`, AFTER the merge, where nothing is watching.
//
// A rename is not a code change, so no diff contains it. That is exactly why it needs a gate derived
// from the live remote rather than from anything committed: the assertion has to be able to disagree
// with the whole repository at once.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The repository this actually IS, and where that answer can be trusted.
 *
 * NOT from the git remote. GitHub redirects a renamed repo, so an existing checkout keeps its old
 * URL and every local tool keeps agreeing with it — the remote is the stale thing, not the witness.
 * That redirect is exactly why the rename stayed invisible until `semantic-release` broke on `main`.
 *
 * `GITHUB_REPOSITORY` is set by Actions to the CURRENT slug, so CI has ground truth. Locally there
 * is none without a network call, and a gate must not make one. So local runs check INTERNAL
 * CONSISTENCY — everything agrees with package.json — and CI additionally checks that package.json
 * agrees with reality. Same split as the incident scanner: honest offline, authoritative in CI.
 */
const truth = process.env.GITHUB_REPOSITORY ?? null;
const declared = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"))
  .repository.url.replace(/\.git$/, "")
  .replace(/^git\+/, "")
  .replace(/^https?:\/\/github\.com\//, "");
const originSlug = () => truth ?? declared;

/**
 * Every file that is part of THIS repository's state.
 *
 * `.claude/worktrees/` is excluded, and the reason is not tidiness. A parallel agent run checks out
 * OTHER COMMITS into worktrees under it — the governor's feast mode is built on exactly this — and a
 * test that walks the repo root then starts asserting about files from a different point in history.
 * It happened on the first real fleet run: a worktree at an older commit still carried the
 * repository's PREVIOUS NAME in its CHANGELOG, and the rename gate failed against a file that is not
 * part of this working tree at all.
 *
 * The class is worth naming, because it will recur: **a whole-repo assertion is only true of the
 * repo, and a worktree is not the repo.** Any future test that walks from the root inherits this.
 */
const TRANSIENT = new Set(["node_modules", ".git", "worktrees"]);

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (TRANSIENT.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(md|mjs|json|ts)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const SLUG = originSlug();
const [, REPO_NAME] = SLUG.split("/");

test("package.json names the repository it actually lives in", () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
  if (!truth) {
    console.error("GITHUB_REPOSITORY unset — checking internal consistency only; CI checks reality.");
  }
  assert.match(pkg.repository.url, new RegExp(`${SLUG}(\\.git)?$`), `repository.url should point at ${SLUG}`);
  assert.equal(pkg.name, REPO_NAME, "the package name should match the repository name");
});

test("the marketplace name matches, so the install command in the README is real", () => {
  const mp = JSON.parse(readFileSync(join(REPO_ROOT, ".claude-plugin/marketplace.json"), "utf8"));
  assert.equal(mp.name, REPO_NAME);
  const readme = readFileSync(join(REPO_ROOT, "README.md"), "utf8");
  assert.match(readme, new RegExp(`/plugin marketplace add ${SLUG}`), "the documented install must work");
});

test("every plugin manifest points at this repository", () => {
  for (const p of readdirSync(join(REPO_ROOT, "plugins"))) {
    const manifest = join(REPO_ROOT, "plugins", p, ".claude-plugin/plugin.json");
    const { repository } = JSON.parse(readFileSync(manifest, "utf8"));
    if (repository) assert.match(repository, new RegExp(`${SLUG}$`), `${p} points at the wrong repo`);
  }
});

test("no file anywhere links to a different repository under this owner", () => {
  // Scoped by CATEGORY: any github.com/<owner>/<something-else> link is a rename that was only half
  // followed through. Ledgers are exempt because they are a HISTORICAL record — an entry describing
  // what happened under the old name is correct, and rewriting history to satisfy a gate is worse
  // than the drift it prevents.
  const [owner] = SLUG.split("/");
  const historical = ["docs/JOURNAL.md", "docs/LESSONS.md", "CHANGELOG.md"];
  const stale = [];
  for (const file of walk(REPO_ROOT)) {
    const rel = file.slice(REPO_ROOT.length + 1);
    if (historical.some((h) => rel === h)) continue;
    for (const m of readFileSync(file, "utf8").matchAll(new RegExp(`github\\.com/${owner}/([\\w.-]+)`, "g"))) {
      const named = m[1].replace(/\.git$/, "");
      if (named !== REPO_NAME && named !== "skynet-capital") stale.push(`${rel} → ${m[0]}`);
    }
  }
  assert.deepEqual(stale, [], `links naming a repository this is not:\n  ${stale.join("\n  ")}`);
});
