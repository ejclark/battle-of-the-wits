#!/usr/bin/env node
// Version sync — one release version, propagated to every manifest that carries one.
//
// Claude Code decides whether a user gets a plugin update by comparing `version` in
// plugin.json. If that field drifts from the repo's released version, installs go stale
// silently — the worst kind of failure, because nothing is red. So the release owns the
// number and this script writes it everywhere, rather than a human remembering to.
//
//   node scripts/sync-versions.mjs 1.4.0   # set every manifest to 1.4.0
//   node scripts/sync-versions.mjs --check # verify they already agree (CI gate)
//
// Run by semantic-release's prepare step; the resulting diff is committed by @semantic-release/git.
import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MARKETPLACE = join(ROOT, ".claude-plugin/marketplace.json");
const PKG = join(ROOT, "package.json");

const pluginManifests = readdirSync(join(ROOT, "plugins"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => join(ROOT, "plugins", e.name, ".claude-plugin/plugin.json"));

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);

const arg = process.argv[2];
const check = arg === "--check";
const version = check ? readJson(PKG).version : arg;

if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error("usage: sync-versions.mjs <semver> | --check");
  process.exit(2);
}

const drift = [];

for (const path of pluginManifests) {
  const manifest = readJson(path);
  if (manifest.version !== version) {
    drift.push(`${manifest.name}: ${manifest.version} ≠ ${version}`);
    if (!check) {
      manifest.version = version;
      writeJson(path, manifest);
    }
  }
}

const marketplace = readJson(MARKETPLACE);
for (const entry of marketplace.plugins ?? []) {
  if (entry.version !== version) {
    drift.push(`marketplace/${entry.name}: ${entry.version} ≠ ${version}`);
    if (!check) entry.version = version;
  }
}
if (!check) writeJson(MARKETPLACE, marketplace);

if (!check) {
  const pkg = readJson(PKG);
  if (pkg.version !== version) {
    pkg.version = version;
    writeJson(PKG, pkg);
  }
}

if (check) {
  if (drift.length) {
    console.error("✗ version drift between package.json and plugin manifests:");
    for (const d of drift) console.error(`    ${d}`);
    console.error("\n  Run `npm run sync-versions -- <version>` — or let the release do it.");
    process.exit(1);
  }
  console.log(`✓ all manifests at ${version}`);
} else {
  console.log(`✓ synced ${pluginManifests.length} plugin manifest(s) + marketplace to ${version}`);
}
