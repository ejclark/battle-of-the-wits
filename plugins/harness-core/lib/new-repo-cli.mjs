#!/usr/bin/env node
// harness-new — create a new GitHub repository, as a home for work the container produces.
//
//   harness-new <name> [--public] [--description TEXT] [--push DIR]
//
// Two uses, one primitive:
//   · a home for `harness-starter` output — generate the project, then `harness-new app --push app/`
//   · a fresh container instance — push a checkout of this harness somewhere new and import into it
//
// PRIVATE BY DEFAULT. Publishing is the irreversible class: a repo born private becomes public in
// one human click, while un-publishing removes nothing that was already cloned. `--public` exists
// and is deliberately a flag somebody has to type.
//
// THIS CREATES AND, AT MOST, PUSHES ONCE. It does not adopt, does not bootstrap, does not invite
// collaborators — the same one-verb rule as `harness-import`, because a command that does three
// things cannot tell you which one failed. Needs GH_TOKEN/GITHUB_TOKEN in the environment; the
// harness carries the mechanism, never the credential.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRepo } from "./github.mjs";

const argv = process.argv.slice(2);
const at = (flag) => (argv.indexOf(flag) >= 0 ? argv[argv.indexOf(flag) + 1] : null);
const name = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1]?.startsWith("--") !== true);

if (!name) {
  console.log("\n  harness-new <name> [--public] [--description TEXT] [--push DIR]\n");
  console.log("  Creates the repository under the authenticated account, PRIVATE unless --public.");
  console.log("  With --push, an existing local git repository is pushed to it as origin/main.\n");
  process.exit(argv.length ? 1 : 0);
}

try {
  const made = await createRepo(name, { description: at("--description") ?? "", isPrivate: !argv.includes("--public") });
  console.log(`\n  ✓ created ${made.fullName} (${made.private ? "private" : "PUBLIC"})`);

  const pushDir = at("--push");
  if (pushDir) {
    const dir = resolve(pushDir);
    if (!existsSync(`${dir}/.git`)) {
      console.error(`\n  ✗ ${dir} is not a git repository — init and commit it first, then re-run with --push.\n`);
      process.exit(1);
    }
    execFileSync("git", ["-C", dir, "remote", "add", "origin", made.cloneUrl], { stdio: "pipe" });
    execFileSync("git", ["-C", dir, "push", "-u", "origin", "HEAD"], { stdio: "inherit" });
    console.log(`\n  ✓ pushed ${dir} → ${made.fullName}\n`);
  } else {
    // The next step, printed rather than performed — the import is a separate verb on purpose.
    console.log("\n  Pull it into the container to work on it:\n");
    console.log(`      harness-import ${made.cloneUrl}\n`);
  }
} catch (err) {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
}
