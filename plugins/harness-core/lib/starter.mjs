#!/usr/bin/env node
// THE STARTER — a real first app on disk, in one command.
//
//   harness-starter            # hello — one page, a picture from five words you pick
//   harness-starter --todo     # the fuller app: create, delete, edit, with tests and requirements
//   harness-starter --react    # React, with a dev server that opens the browser itself
//   harness-starter --force    # overwrite existing files
//   harness-starter --git      # …and make it a git repository, committed, ready to publish
//
// WHY A SCAFFOLD RATHER THAN INSTRUCTIONS. `FIRST-APP.md` teaches the arc and is the right artifact
// for someone learning what the steps ARE. But somebody who has never built anything cannot type a
// tested application from a document, and the twenty minutes they would spend fighting a typo in a
// config file teaches nothing at all — it is the part of the work with no lesson in it.
//
// So this writes the boring half, and every interesting decision is left visibly undone: the styles
// say to change them, the requirements say to add one, the tests say what shape a new one takes.
//
// WHAT THE FIRST TWO RUNGS DELIBERATELY DO NOT DO. No bundler config, no framework, no build step.
// `index.html` loads ES modules directly, which every browser has done for years, so `npx serve .`
// is the entire toolchain. That is a real choice with a real trade-off, stated rather than hidden:
// a bundler earns its place the moment you need one, and NOT before — installing 200 packages to
// render a list is how a first project stops being fun on day one. The React rung is where one
// earns it, and it is opt-in for exactly that reason.
//
// The logic file has no DOM in it, which is the load-bearing decision. It is why the tests need no
// browser and no setup, and why they are three lines each — the thing that decides whether somebody
// writes a second test is whether the first one was easy.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// TWO RUNGS, and the lower one is the important one. The to-do app is a good FIRST PROJECT and a bad
// first five minutes: eight tests and nine requirements is a lot to meet before anything has worked.
// `hello` is one page, four files, and a picture drawn from five words the person chose — so the
// first thing they change is something they invented rather than something off a list.
//
// The order matters more than either template. Somebody who has seen their own words become a
// picture will open the to-do app looking for what to change; somebody handed the to-do app first is
// reading a codebase.
// THE THIRD RUNG IS A FRAMEWORK, and it is the one place this file's no-bundler rule gives way.
// The rule was never "bundlers are bad" — it is that one has to EARN its place, and React is the
// moment it does: JSX is not JavaScript, so something must translate it, and pretending otherwise
// would hand somebody a hand-rolled setup unlike every guide they will find. rspack, because that
// is what this project builds with; a starter that taught a different toolchain from the harness
// around it would be teaching a fork.
const KINDS = {
  hello: "../templates/starter/hello",
  todo: "../templates/starter/todo",
  react: "../templates/starter/react",
};
const SRC = join(HERE, KINDS.hello); //  the DEFAULT rung, and it is the lower one on purpose

/** The rungs, by name. Exported so nothing downstream has to keep a second list of them. */
export const STARTER_KINDS = Object.keys(KINDS);

/** Every file in the starter, as paths relative to its root. */
export function starterFiles(root = SRC) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(root, p).split("\\").join("/"));
    }
  };
  walk(root);
  return out.sort();
}

/**
 * The scripts a starter repo needs, READ FROM the rung's own package.json rather than kept beside
 * it.
 *
 * Each rung now ships a real package.json, which is what closed the defect this constant used to
 * embody: the starter PRINTED these lines and asked a beginner to transcribe them into a file that
 * did not exist, so the first thing they typed — `npm run dev` — failed with ENOENT. A person who
 * has never written code cannot be asked to hand-assemble JSON before anything has ever worked.
 *
 * Derived, so there is one copy. Two would drift, and the one that drifts is the one nobody runs.
 */
export const scriptsOf = (kind = "hello") =>
  JSON.parse(readFileSync(join(HERE, KINDS[kind] ?? KINDS.hello, "package.json"), "utf8")).scripts;

export const STARTER_SCRIPTS = scriptsOf("hello");

/**
 * Make `dest` a git repository with the starter as its first commit — the missing half of "a real
 * first app on disk".
 *
 * NOT a second verb, and the distinction matters because this file's neighbours are strict about it:
 * `harness-import` refuses to adopt, `harness-new` refuses to bootstrap. Version control is not a
 * separate act from scaffolding a starting point, it is *part of* one — an app you cannot undo a
 * change to is not somewhere safe to experiment, which is the entire promise the starter makes. And
 * it is what turns `harness-new --push` from an error into a next step.
 *
 * Already a repository? Left completely alone, initial commit and all. Someone running the starter
 * inside existing work is not asking for their history to be touched.
 */
export function initGit(dest, { run = (cmd, args) => execFileSync(cmd, args, { cwd: dest, stdio: "pipe" }) } = {}) {
  if (existsSync(join(dest, ".git"))) return { initialised: false, reason: "already a git repository" };
  run("git", ["init", "-q", "-b", "main"]);
  run("git", ["add", "-A"]);
  // -c rather than `git config`: the identity is for THIS commit, not written into the new repo, so
  // the person's own name lands on everything they do next rather than a placeholder they inherit.
  run("git", ["-c", "user.name=starter", "-c", "user.email=starter@localhost", "commit", "-qm", "chore: the starter, before anything of mine"]);
  return { initialised: true };
}

/**
 * Write the starter. NEVER clobbers without `--force` — the same rule the bootstrap follows, and for
 * the same reason: an existing file is a decision somebody made.
 */
export function writeStarter(dest, { force = false, dryRun = false, kind = "hello" } = {}) {
  const from = join(HERE, KINDS[kind] ?? KINDS.hello);
  const wrote = [];
  const skipped = [];
  for (const rel of starterFiles(from)) {
    const to = join(dest, rel);
    if (existsSync(to) && !force) {
      skipped.push(rel);
      continue;
    }
    wrote.push(rel);
    if (dryRun) continue;
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(from, rel), to);
  }
  return { wrote, skipped };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("starter.mjs")) {
  const dryRun = process.argv.includes("--dry-run");
  const kind = process.argv.includes("--react") ? "react" : process.argv.includes("--todo") ? "todo" : "hello";
  const { wrote, skipped } = writeStarter(process.cwd(), { force: process.argv.includes("--force"), dryRun, kind });
  const label = { hello: "Hello", todo: "To-do", react: "React" }[kind];

  console.log(`\n  \u2726 ${label} starter${dryRun ? " \u2014 DRY RUN, nothing written" : ""}\n`);
  for (const f of wrote) console.log(`      + ${f}`);
  for (const f of skipped) console.log(`      \u00b7 ${f}  (already there \u2014 yours wins)`);

  if (process.argv.includes("--git") && !dryRun) {
    const { initialised, reason } = initGit(process.cwd());
    console.log(initialised ? "\n      \u2713 git repository, first commit made \u2014 every change from here is undoable" : `\n      \u00b7 ${reason} \u2014 left untouched`);
  }

  // THE NEXT COMMAND, NOT THE NEXT CHORE. This used to print a fragment of JSON and ask the reader
  // to put it in a file that did not exist. Every rung now ships its own package.json, so what
  // follows is something to type rather than something to assemble.
  if (kind === "react") {
    console.log(`
  Two commands, and the second one opens your browser:

      npm install     \u2192  once, to fetch React and the build
      npm run dev     \u2192  the page opens by itself, and stays open while you work

  Then change something. The heading in src/App.jsx, a colour in src/style.css. Save, and the page
  updates \u2014 that loop, change and look, is the whole job and it never gets more complicated.

  src/greeting.js has NO React in it, and that is the one decision here worth copying: the rules
  live apart from the drawing, which is why \`npm test\` needs no browser and each test is three lines.
`);
    process.exit(0);
  }

  if (kind === "hello") {
    console.log(`
      npm run dev     \u2192  then open the address it prints

  Change the heading. Change a colour in style.css. Reload. That loop \u2014 change, reload, look \u2014 is the
  whole job, and it never gets more complicated than it is right now.

  The picture is drawn from the five words at the top of art.mjs. Change one and reload; it will be a
  different picture, and you can work out WHY by reading fifteen lines.

  Cannot think of five words? STUCK.md asks you five questions instead, and the answers ARE the input.
  Nobody else's page will look like yours.

  Ready for something that does more? \`harness-starter --todo\`, or \`--react\` for a framework.
`);
    process.exit(0);
  }

  console.log(`
      npm test        \u2192  8 tests, all passing, before you have written anything
      npm run dev     \u2192  open the address it prints

  A green suite on the first run is not a formality. It means the thing you are about to change is
  known-good right now, so anything that breaks next is something you did \u2014 which is the only way a
  test suite is ever actually useful.

  REQUIREMENTS.md says what each test is checking and why four of the nine cases are about things
  going WRONG. Those are the ones nobody tests by hand, and the ones a change six months from now is
  most likely to break.
`);
}
