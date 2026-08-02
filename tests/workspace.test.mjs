// A FOREIGN REPOSITORY LIVES INSIDE THIS ONE. These are the tests that make that safe.
//
// Imports land in `.harness/workspace/<repo>/<branch>` — contained on purpose, because the
// alternative was three machine-local directories (%LOCALAPPDATA%, XDG, Application Support) that
// are assumptions about machines this project does not control and can only be tested on three
// different computers. A path relative to the repository root behaves identically everywhere.
//
// The trade is that containment buys three hazards, and the deal is only good if each one has a test
// standing on it. That is this file. If any of these goes green while the thing it guards is broken,
// the trade stopped being worth making and nobody found out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { HARNESS_ROOT, WORKSPACE, assertContained, contains, importedCheckouts, pathFor, segment, workspaceRoot } from "../plugins/harness-core/lib/workspace.mjs";
import { resolveRoot } from "../plugins/harness-core/lib/serve.mjs";
import { importRepo, nameOf } from "../plugins/harness-core/lib/import-repo.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── hazard 1: git must never be able to commit somebody else's repository ───────

test("git cannot stage anything in the workspace, even with `git add -A`", () => {
  // PLANTED, not asserted from the gitignore's text. A rule stated in a file is a claim; a file that
  // git refuses to stage is the property. This plants a real file and asks git directly.
  const planted = join(REPO, WORKSPACE, "planted-by-a-test", "main", "secret.txt");
  mkdirSync(dirname(planted), { recursive: true });
  writeFileSync(planted, "an entire foreign repository could be here");
  try {
    const ignored = execFileSync("git", ["check-ignore", planted], { cwd: REPO, encoding: "utf8" }).trim();
    assert.ok(ignored.length > 0, "the workspace must be ignored by git");
    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: REPO, encoding: "utf8" });
    assert.doesNotMatch(status, /\.harness/, "nothing under .harness may ever appear as stageable");
  } finally {
    rmSync(join(REPO, WORKSPACE, "planted-by-a-test"), { recursive: true, force: true });
  }
});

test("the gitignore rule is not something a tidy-up can quietly remove", () => {
  assert.match(readFileSync(join(REPO, ".gitignore"), "utf8"), /^\.harness\/$/m, ".harness/ must be gitignored");
});

// ── hazard 2: the gates must never measure an imported repo's debt as ours ──────

test("every gate is told to skip the workspace", () => {
  // A scanner that walked into an imported repository would report its file sizes, its duplication
  // and its copy-paste as this project's debt — and the budgets would ratchet to absorb somebody
  // else's code, which is unrecoverable without knowing it happened.
  const descriptor = JSON.parse(readFileSync(join(REPO, "harness.json"), "utf8"));
  assert.ok(
    descriptor.exclude?.some((e) => e.replace(/\\/g, "/").startsWith(".harness")),
    "harness.json must exclude .harness/ or the gates will scan imported repositories",
  );
});

test("an imported repository is not visible to the source scan", () => {
  // The property behind the descriptor entry: source files planted in the workspace must not be
  // picked up. Planted with the repo's own sourceExt so a scanner that ignored the exclude list
  // would definitely find them.
  const planted = join(REPO, WORKSPACE, "fake-adopter", "main", "lib");
  mkdirSync(planted, { recursive: true });
  writeFileSync(join(planted, "enormous.mjs"), "// x\n".repeat(900));
  try {
    const out = execFileSync(process.execPath, [join(REPO, "plugins/harness-gates/lib/arch-scan.mjs")], {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.doesNotMatch(out, /enormous\.mjs/, "the arch gate walked into an imported repository");
  } catch (err) {
    assert.doesNotMatch(`${err.stdout ?? ""}${err.stderr ?? ""}`, /enormous\.mjs/, "the arch gate walked into an imported repository");
  } finally {
    rmSync(join(REPO, WORKSPACE, "fake-adopter"), { recursive: true, force: true });
  }
});

// ── hazard 3: nothing may escape the workspace ─────────────────────────────────

test("a branch or repo name cannot traverse out of the workspace", () => {
  // The escape that would put a foreign checkout in plugins/. `/` is legal in a branch name and is
  // also a path separator, so this is not a hypothetical.
  for (const evil of ["../../plugins", "..\\..\\plugins", "feature/../../..", "....//....//etc"]) {
    const p = pathFor("acme", evil);
    assert.ok(contains(workspaceRoot(), p), `"${evil}" escaped the workspace: ${p}`);
    assert.doesNotThrow(() => assertContained(p));
  }
  assert.ok(contains(workspaceRoot(), pathFor("../../../etc", "main")), "a repo name must not escape either");
});

test("a legal branch name becomes exactly one path segment", () => {
  // `feature/thing` must not silently become two directories — the workspace layout is
  // <repo>/<branch> and a branch that adds depth breaks every assumption above it.
  const p = pathFor("acme", "feature/thing");
  const tail = p.slice(workspaceRoot().length + 1);
  assert.equal(tail.split(sep).length, 2, `expected <repo>/<branch>, got "${tail}"`);
  assert.equal(segment("feature/thing"), "feature-thing");
});

test("names Windows cannot open are rewritten, not passed through", () => {
  // Every one of these is legal on Linux and unopenable on Windows. Our first contributor is on
  // Windows; a path he cannot open is a defect, not an edge case.
  for (const ch of ["<", ">", ":", '"', "|", "?", "*"]) {
    assert.doesNotMatch(segment(`a${ch}b`), /[<>:"|?*]/, `"${ch}" survived into a path segment`);
  }
  assert.doesNotMatch(segment("trailing."), /\.$/, "Windows strips trailing dots, then cannot find the path");
  assert.doesNotMatch(segment("trailing "), /\s$/, "same for trailing spaces");
  assert.equal(segment("...."), "unnamed", "a name that sanitises to nothing still needs a directory");
  // Reserved device names are illegal as a component at any depth, with any extension.
  for (const reserved of ["con", "AUX", "nul", "com1", "LPT9"]) {
    const p = pathFor(reserved, "main");
    assert.doesNotMatch(p.split(sep).at(-2), /^(con|prn|aux|nul|com\d|lpt\d)$/i, `${reserved} is unopenable on Windows`);
  }
});

test("the workspace is derived from the module, never from the working directory", () => {
  // A tool that resolves its paths from cwd writes into whatever directory it happened to be invoked
  // from — and with nested .git directories in play, that is how a foreign repo ends up committed to
  // this one. Same answer regardless of where the process is standing.
  const here = workspaceRoot();
  const elsewhere = mkdtempSync(join(tmpdir(), "cwd-"));
  const prev = process.cwd();
  try {
    process.chdir(elsewhere);
    assert.equal(workspaceRoot(), here, "the workspace moved when the cwd did");
  } finally {
    process.chdir(prev);
  }
  assert.ok(contains(HARNESS_ROOT, here), "the workspace must be inside the checkout");
});

// ── the import itself ──────────────────────────────────────────────────────────

test("the repository name is read from a url or a path, either separator", () => {
  assert.equal(nameOf("https://github.com/acme/thing.git"), "thing");
  assert.equal(nameOf("https://github.com/acme/thing"), "thing");
  assert.equal(nameOf("git@github.com:acme/thing.git"), "thing");
  assert.equal(nameOf("/home/me/projects/thing/"), "thing");
  assert.equal(nameOf("C:\\Users\\me\\thing"), "thing");
  assert.equal(nameOf(""), "repo", "an unreadable name still needs a directory");
});

test("it clones into the computed directory, with the branch it was asked for", () => {
  const calls = [];
  const root = mkdtempSync(join(tmpdir(), "harness-root-"));
  const res = importRepo("https://github.com/acme/thing.git", {
    branch: "release/2.x",
    harnessRoot: root,
    run: (cmd, args) => calls.push([cmd, args]),
  });
  assert.equal(calls.length, 1);
  const [cmd, args] = calls[0];
  assert.equal(cmd, "git");
  assert.ok(args.includes("--branch") && args.includes("release/2.x"), "the branch must be passed to git, unsanitised");
  assert.equal(args.at(-1), res.dir, "it must clone into the computed directory");
  assert.match(res.dir, /release-2\.x$/, "but the DIRECTORY is the sanitised form");
  assert.equal(res.cloned, true);
});

test("an already-imported repository is left alone", () => {
  // Re-cloning would throw away work somebody has in there, and silently pulling would change a
  // checkout under a session that thinks it knows what it is looking at. Neither is ours to do.
  const root = mkdtempSync(join(tmpdir(), "harness-root-"));
  const dir = pathFor("thing", "main", { harnessRoot: root });
  mkdirSync(join(dir, ".git"), { recursive: true });
  let ran = false;
  const res = importRepo("https://github.com/acme/thing.git", { harnessRoot: root, run: () => (ran = true) });
  assert.equal(ran, false, "it must not re-clone over an existing import");
  assert.equal(res.cloned, false);
  assert.match(res.reason, /already imported/);
});

test("it clones and does not adopt", () => {
  // Two commands, on purpose: one that clones and one that adopts. A single command that did both
  // could not tell you which half failed, and "the clone failed" versus "the harness broke my repo"
  // is exactly the distinction an adopter needs in their first five minutes.
  const src = readFileSync(join(REPO, "plugins/harness-core/lib/import-repo.mjs"), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  assert.doesNotMatch(src, /run\(.*bootstrap|--auto"/, "importing must not run the adoption");
  assert.ok(existsSync(join(REPO, "plugins/harness-core/bin/harness-import")), "the launcher must exist");
  assert.ok(existsSync(join(REPO, "plugins/harness-core/bin/harness-import.cmd")), "and its Windows twin");
});

// ── the container question: which repository is the server about? ─────────────

/** A fake harness root with the given imported checkouts (a `.git` dir marks a real import). */
function harnessWith(...imports) {
  const root = mkdtempSync(join(tmpdir(), "harness-root-"));
  for (const [repo, branch] of imports) {
    mkdirSync(join(pathFor(repo, branch, { harnessRoot: root }), ".git"), { recursive: true });
  }
  return root;
}

test("importedCheckouts reports real imports and ignores debris", () => {
  const root = harnessWith(["skynet-capital", "main"], ["widget-shop", "main"]);
  // Debris: a directory with no .git is a half-finished clone or a stray folder, not an import.
  mkdirSync(join(workspaceRoot(root), "stray", "main"), { recursive: true });
  assert.deepEqual(
    importedCheckouts(root).map((c) => c.repo),
    ["skynet-capital", "widget-shop"],
    "two imports, the .git-less directory excluded",
  );
  assert.deepEqual(importedCheckouts(mkdtempSync(join(tmpdir(), "harness-root-"))), [], "no workspace at all is an answer, not a crash");
});

test("an explicit --root wins from any cwd", () => {
  const root = harnessWith(["skynet-capital", "main"]);
  const { root: chosen, why } = resolveRoot(["--root", "/somewhere/else"], root, root, importedCheckouts(root));
  assert.match(chosen.split(sep).join("/"), /somewhere\/else$/);
  assert.equal(why, "--root");
});

test("started inside some other repository, the server serves THAT — the adopter path, unchanged", () => {
  const root = harnessWith(["skynet-capital", "main"]);
  const elsewhere = mkdtempSync(join(tmpdir(), "adopter-"));
  assert.equal(resolveRoot([], elsewhere, root, importedCheckouts(root)).root, elsewhere);
});

test("at the harness root with exactly one import, the import is the subject", () => {
  // The container intent: a repository pulled into scope is the thing being worked on, and one
  // import is unambiguous evidence of which. `npm start` shows the work, not the container.
  const root = harnessWith(["skynet-capital", "main"]);
  const { root: chosen, why } = resolveRoot([], root, root, importedCheckouts(root));
  assert.equal(chosen, pathFor("skynet-capital", "main", { harnessRoot: root }));
  assert.match(why, /skynet-capital/);
});

test("zero or several imports fall back to the harness rather than guessing", () => {
  // Picking one of three imports by any tiebreak would be the harness inventing an answer the
  // human never gave. The chooser is printed by the CLI instead; here the rule just holds.
  const none = harnessWith();
  assert.equal(resolveRoot([], none, none, importedCheckouts(none)).root, none);
  const many = harnessWith(["a", "main"], ["b", "main"]);
  const { root: chosen, why } = resolveRoot([], many, many, importedCheckouts(many));
  assert.equal(chosen, many);
  assert.match(why, /--root/, "the several-imports answer must point at the flag that resolves it");
});
