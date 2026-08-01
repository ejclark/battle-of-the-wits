#!/usr/bin/env node
// Version gate — enforce that plugin manifests carry NO `version` field.
//
// Why the rule inverted: a ruleset that requires changes to go through a pull request also forbids
// the release from pushing a version-bump commit back to `main`. `@semantic-release/git` does
// exactly that, so the release job died with GH013 the first time branch protection was on. Rather
// than carve a bypass into a freshly-created ruleset, this repo drops the field entirely.
//
// Claude Code's contract makes that safe (`docs/en/plugins-reference` → version management): when a
// plugin manifest omits `version` and the plugin is distributed via git, the COMMIT SHA is the
// version, and every commit is a new one. Users still get updates; the repo never needs a
// post-merge push. semantic-release keeps tagging and writing release notes for humans.
//
// The trade this makes, stated plainly: updates are per-commit rather than per-semver-release, so
// installs are noisier but never stale. If you would rather have semver in the manifests, add a
// ruleset bypass actor for GitHub Actions and restore `@semantic-release/git` — both, or neither.
//
//   node scripts/check-versions.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const offenders = [];

const pluginDirs = existsSync(join(ROOT, "plugins"))
  ? readdirSync(join(ROOT, "plugins"), { withFileTypes: true }).filter((e) => e.isDirectory())
  : [];

for (const dir of pluginDirs) {
  const path = join(ROOT, "plugins", dir.name, ".claude-plugin/plugin.json");
  if (!existsSync(path)) continue;
  const manifest = readJson(path);
  if (manifest.version !== undefined) {
    offenders.push(`plugins/${dir.name}/.claude-plugin/plugin.json → version: "${manifest.version}"`);
  }
}

const marketplacePath = join(ROOT, ".claude-plugin/marketplace.json");
if (existsSync(marketplacePath)) {
  for (const entry of readJson(marketplacePath).plugins ?? []) {
    if (entry.version !== undefined) {
      offenders.push(`.claude-plugin/marketplace.json → ${entry.name}: "${entry.version}"`);
    }
  }
}

if (offenders.length) {
  console.error("✗ a plugin manifest carries a `version` field:\n");
  for (const o of offenders) console.error(`    ${o}`);
  console.error(`
  Remove it. Versions are not committed in this repo: the ruleset forbids the release from
  pushing to main, so a committed version would go stale the moment it drifted from the tag —
  silently, with nothing red. Claude Code uses the commit SHA when the field is absent.

  If you want semver in the manifests instead, that is a deliberate change: add a ruleset bypass
  actor for GitHub Actions, restore @semantic-release/git, and delete this gate in the same PR.
`);
  process.exit(1);
}

console.log(`✓ ${pluginDirs.length} plugin manifest(s) carry no committed version — SHA-tracked`);
