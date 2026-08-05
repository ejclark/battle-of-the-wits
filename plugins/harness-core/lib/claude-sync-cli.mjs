#!/usr/bin/env node
// harness-claude-sync — put the harness's skills and agents in a repository as ordinary files.
//
//   harness-claude-sync            # write them into ./.claude/
//   harness-claude-sync --check    # exit 1 if any is missing or has drifted
//   harness-claude-sync --dry-run  # say what would change, write nothing
//
// The vanilla integration: no `/plugin install`, no marketplace, no CLAUDE_PLUGIN_ROOT. Run it in a
// target repository and its `.claude/` carries the same drills this harness ships. Run `--check` in
// CI and a copy can never quietly fall behind — which is the only reason copying is safe at all.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { syncClaudeAssets } from "./claude-assets.mjs";

const HARNESS = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const argv = process.argv.slice(2);
const check = argv.includes("--check");
const dryRun = argv.includes("--dry-run");

const { wrote, drifted, missing } = syncClaudeAssets(HARNESS, process.cwd(), { check, dryRun });

if (check && (drifted.length || missing.length)) {
  console.error("\n  ✗ .claude/ is out of step with the harness.\n");
  // Drift and absence are reported apart on purpose: absent is a repo that has not synced, drifted
  // is a repo where somebody edited the generated copy instead of the source. Only the second is a
  // mistake, and rolling them together would hide the one worth seeing.
  for (const f of drifted) console.error(`    drifted  ${f}`);
  for (const f of missing) console.error(`    missing  ${f}`);
  console.error("\n  Run `harness-claude-sync`. These files are GENERATED — if one of them is wrong,");
  console.error("  fix it in the harness so every repository gets the fix, not just this one.\n");
  process.exit(1);
}

if (check) {
  console.log("✓ .claude/ matches the harness");
  process.exit(0);
}

const changed = [...wrote, ...(dryRun ? [...drifted, ...missing] : [])];
console.log(`\n  ✦ harness skills and agents${dryRun ? " — DRY RUN, nothing written" : ""}\n`);
for (const f of changed) console.log(`      + ${f}`);
console.log(
  changed.length
    ? `\n  ${changed.length} file(s)${dryRun ? " would be written" : " written"}. They are generated — improve them in the harness.\n`
    : "\n  Nothing to do — already current.\n",
);
