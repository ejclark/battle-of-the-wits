// THE WORKSPACE — where a repository being tested against lives: `.harness/workspace/<repo>/<branch>`,
// inside this checkout, on purpose.
//
// "Portable" is a claim until a repository that did not grow here has run this and stayed. Proving it
// means bringing a real outside repository in, adopting the harness into it, and watching what
// breaks — which is how every cold-start defect so far was found.
//
// CONTAINED, AND THAT IS THE DESIGN DECISION. The obvious alternative is a machine-local directory —
// %LOCALAPPDATA% on Windows, XDG on Linux, Application Support on macOS. It was written that way
// first and it was wrong: every one of those is an ASSUMPTION about a machine this project does not
// control, three different code paths that can only be tested on three different machines, and a
// place where files outlive the checkout that made them. A path relative to the repository root
// behaves identically on all three, and when it does not, the gap is ours to close rather than the
// operating system's to explain.
//
// THE PRICE, PAID RATHER THAN IGNORED. Putting a foreign repository inside this one buys three real
// hazards, and each has a countermeasure with a test:
//
//   1. The gates would scan somebody else's code and report their debt as ours.
//      → `.harness/` is in harness.json's exclude list, and a test fails if it is removed.
//   2. `git add -A` would commit an entire foreign repository.
//      → `.harness/` is gitignored, and a test plants a file there and fails if git can stage it.
//   3. Nested .git directories make routine git commands ambiguous about which repo you are in.
//      → every path here is absolute and derived from the harness root, never from the cwd.
//
// A hazard with a test on it is a hazard we control. That is the whole trade.
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** This checkout. Derived from the module's own location, never from the working directory. */
export const HARNESS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** The one directory imports live in. Not configurable — a second location is a second set of bugs. */
export const WORKSPACE = join(".harness", "workspace");

/** Where imported repositories live, absolute. */
export function workspaceRoot(harnessRoot = HARNESS_ROOT) {
  return join(harnessRoot, WORKSPACE);
}

/**
 * One path segment, safe on every filesystem this can land on.
 *
 * A branch name may contain `/`, which is a path separator — `feature/thing` would silently become
 * two directories and `../..` would become an escape out of the workspace and into the repository
 * this is supposed to stay out of. Windows additionally forbids `<>:"|?*`, so a branch name legal on
 * the machine that created it can be illegal on the machine reading it.
 *
 * Collapsed rather than rejected: refusing to import a repository because of its branch name is a
 * tool arguing with reality. The mapping is lossy and does not need to be reversible — nothing reads
 * the branch back out of the path.
 */
export function segment(name) {
  const cleaned = String(name)
    .replace(/[/\\<>:"|?* -]/g, "-") //  separators, and everything Win32 forbids
    .replace(/^\.+/, "") //  no leading dots: no traversal, no accidental hidden directory
    .replace(/[.\s]+$/, "") //  Windows silently strips trailing dots and spaces, then cannot find the path
    .replace(/-+/g, "-")
    .slice(0, 80);
  return cleaned || "unnamed";
}

/**
 * Reserved device names on Windows — illegal as a path COMPONENT at any depth, with any extension.
 * A repository called `aux` is perfectly legal on GitHub and unopenable on Windows.
 */
const RESERVED = new Set(["con", "prn", "aux", "nul", ...Array.from({ length: 9 }, (_, i) => [`com${i + 1}`, `lpt${i + 1}`]).flat()]);

const safeSegment = (s) => {
  const seg = segment(s);
  return RESERVED.has(seg.toLowerCase().split(".")[0]) ? `${seg}-repo` : seg;
};

/** The directory a given repository and branch belongs in. */
export function pathFor(repo, branch = "main", { harnessRoot = HARNESS_ROOT } = {}) {
  return join(workspaceRoot(harnessRoot), safeSegment(repo), safeSegment(branch));
}

/**
 * Is `target` inside `root`? Compared as resolved paths with a trailing separator, because a bare
 * prefix test says `/a/b` contains `/a/bc`.
 *
 * Case is folded on Windows and macOS, where the filesystem does not distinguish it — a containment
 * check that did would be bypassed by typing a capital letter.
 */
export function contains(root, target, platform = process.platform) {
  const norm = (p) => {
    const abs = resolve(p) + sep;
    return platform === "win32" || platform === "darwin" ? abs.toLowerCase() : abs;
  };
  return norm(target).startsWith(norm(root));
}

/**
 * The refusal, now inverted from where this started: a computed path must land INSIDE the workspace.
 *
 * Everything reaching here is derived from `pathFor`, so this can only fail if a repository or branch
 * name escaped `segment()` — which is exactly the traversal case worth failing loudly on rather than
 * discovering as a foreign checkout sitting in `plugins/`.
 */
export function assertContained(target, harnessRoot = HARNESS_ROOT) {
  const ws = workspaceRoot(harnessRoot);
  if (!contains(ws, target)) {
    throw new Error(
      `refusing to import into "${target}" — it is outside ${WORKSPACE}.\n` +
        "  Imports are contained inside this checkout so the gates, the gitignore and the tests can\n" +
        "  all reason about them. A path that escapes the workspace is a bug in how it was built.",
    );
  }
  return target;
}

/** Has this repo/branch already been imported? */
export const isImported = (dir) => existsSync(join(dir, ".git"));

/**
 * Every checkout currently in the workspace: `{ repo, branch, dir }`, sorted for stable output.
 *
 * A directory only counts with a `.git` inside it — a half-finished clone or a stray folder is not
 * an import, and reporting one as such would hand a caller a root that git commands fail on. Read
 * fresh on every call rather than cached, because the whole point of asking is that an import may
 * just have happened.
 */
export function importedCheckouts(harnessRoot = HARNESS_ROOT) {
  const ws = workspaceRoot(harnessRoot);
  const out = [];
  if (!existsSync(ws)) return out;
  for (const repo of readdirSync(ws, { withFileTypes: true })) {
    if (!repo.isDirectory()) continue;
    for (const branch of readdirSync(join(ws, repo.name), { withFileTypes: true })) {
      const dir = join(ws, repo.name, branch.name);
      if (branch.isDirectory() && isImported(dir)) out.push({ repo: repo.name, branch: branch.name, dir });
    }
  }
  return out.sort((a, b) => a.repo.localeCompare(b.repo) || a.branch.localeCompare(b.branch));
}
