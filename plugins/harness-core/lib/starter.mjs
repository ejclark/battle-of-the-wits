#!/usr/bin/env node
// THE STARTER — a real first app on disk, in one command.
//
//   harness-starter            # hello — one page, a picture from five words you pick
//   harness-starter --todo     # the fuller app: create, delete, edit, with tests and requirements
//   harness-starter --force    # overwrite existing files
//
// WHY A SCAFFOLD RATHER THAN INSTRUCTIONS. `FIRST-APP.md` teaches the arc and is the right artifact
// for someone learning what the steps ARE. But somebody who has never built anything cannot type a
// tested application from a document, and the twenty minutes they would spend fighting a typo in a
// config file teaches nothing at all — it is the part of the work with no lesson in it.
//
// So this writes the boring half, and every interesting decision is left visibly undone: the styles
// say to change them, the requirements say to add one, the tests say what shape a new one takes.
//
// WHAT IT DELIBERATELY DOES NOT DO. No bundler config, no framework, no build step. `index.html`
// loads ES modules directly, which every browser has done for years, so `npx serve .` is the entire
// toolchain. That is a real choice with a real trade-off, stated rather than hidden: a bundler earns
// its place the moment you need one, and NOT before — installing 200 packages to render a list is
// how a first project stops being fun on day one.
//
// The logic file has no DOM in it, which is the load-bearing decision. It is why the tests need no
// browser and no setup, and why they are three lines each — the thing that decides whether somebody
// writes a second test is whether the first one was easy.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
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
const KINDS = { hello: "../templates/starter/hello", todo: "../templates/starter/todo" };
const SRC = join(HERE, KINDS.hello); //  the DEFAULT rung, and it is the lower one on purpose

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

/** The scripts a starter repo needs. `serve` is the whole toolchain, deliberately. */
export const STARTER_SCRIPTS = {
  dev: "npx --yes serve . --listen 3000",
  test: "node --test tests/",
};

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
  const kind = process.argv.includes("--todo") ? "todo" : "hello";
  const { wrote, skipped } = writeStarter(process.cwd(), { force: process.argv.includes("--force"), dryRun, kind });

  console.log(`\n  ✦ ${kind === "hello" ? "Hello" : "To-do"} starter${dryRun ? " — DRY RUN, nothing written" : ""}\n`);
  for (const f of wrote) console.log(`      + ${f}`);
  for (const f of skipped) console.log(`      · ${f}  (already there — yours wins)`);

  if (kind === "hello") {
    console.log(`
      "dev": "${STARTER_SCRIPTS.dev}"   →  then open the address it prints

  Change the heading. Change a colour in style.css. Reload. That loop — change, reload, look — is the
  whole job, and it never gets more complicated than it is right now.

  The picture is drawn from the five words at the top of art.mjs. Change one and reload; it will be a
  different picture, and you can work out WHY by reading fifteen lines.

  Cannot think of five words? STUCK.md asks you five questions instead, and the answers ARE the input.
  Nobody else's page will look like yours.

  Ready for something that does more? \`harness-starter --todo\`.
`);
    process.exit(0);
  }

  console.log(`
  Add these to package.json scripts:

      "dev":  "${STARTER_SCRIPTS.dev}"
      "test": "${STARTER_SCRIPTS.test}"

  Then:

      npm test        →  8 tests, all passing, before you have written anything
      npm run dev     →  open the address it prints

  A green suite on the first run is not a formality. It means the thing you are about to change is
  known-good right now, so anything that breaks next is something you did — which is the only way a
  test suite is ever actually useful.

  REQUIREMENTS.md says what each test is checking and why four of the nine cases are about things
  going WRONG. Those are the ones nobody tests by hand, and the ones a change six months from now is
  most likely to break.
`);
}
