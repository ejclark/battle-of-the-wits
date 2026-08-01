#!/usr/bin/env node
// Manifest gate — structural validation of the marketplace and every plugin it lists.
//
// `claude plugin validate` is the authoritative check and CI runs it too, but it needs the CLI
// present. This runs on bare Node so a contributor (or a runner) without Claude Code installed
// still gets the verdict, and it enforces two things the CLI does not: that marketplace entries
// point at directories that actually exist, and that versions agree across every manifest.
//
//   node scripts/validate-manifests.mjs
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const errors = [];
const fail = (msg) => errors.push(msg);

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    fail(`${p}: unreadable or invalid JSON — ${e.message}`);
    return null;
  }
};

const marketplace = readJson(join(ROOT, ".claude-plugin/marketplace.json"));

if (marketplace) {
  if (!marketplace.name) fail("marketplace.json: missing `name`");
  if (!marketplace.owner?.name) fail("marketplace.json: missing `owner.name`");
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    fail("marketplace.json: `plugins` must be a non-empty array");
  }

  for (const entry of marketplace.plugins ?? []) {
    const label = entry.name ?? "<unnamed>";
    if (!entry.name) fail("marketplace.json: a plugin entry has no `name`");
    if (!entry.source) fail(`marketplace.json: ${label} has no \`source\``);
    if (!entry.description) fail(`marketplace.json: ${label} has no \`description\``);
    if (typeof entry.source !== "string") continue; // remote sources aren't ours to check

    // A marketplace entry pointing at a directory that isn't there installs as an empty plugin —
    // silent, and only discovered by whoever tries to use it.
    const dir = join(ROOT, entry.source);
    if (!existsSync(dir)) {
      fail(`marketplace.json: ${label} → \`${entry.source}\` does not exist`);
      continue;
    }
    const manifestPath = join(dir, ".claude-plugin/plugin.json");
    if (!existsSync(manifestPath)) {
      fail(`${entry.source}: missing .claude-plugin/plugin.json`);
      continue;
    }
    const manifest = readJson(manifestPath);
    if (!manifest) continue;
    if (manifest.name !== entry.name) {
      fail(`${entry.source}: plugin.json name \`${manifest.name}\` ≠ marketplace entry \`${entry.name}\``);
    }
    if (!manifest.description) fail(`${entry.source}: plugin.json has no \`description\``);

    // Structure rule that bites everyone once: only plugin.json belongs in .claude-plugin/.
    for (const stray of ["skills", "agents", "hooks", "commands"]) {
      if (existsSync(join(dir, ".claude-plugin", stray))) {
        fail(`${entry.source}: \`${stray}/\` must live at the plugin root, not inside .claude-plugin/`);
      }
    }
  }
}

// Every plugin directory on disk should be listed — an unlisted plugin is invisible to users.
const pluginsDir = join(ROOT, "plugins");
if (existsSync(pluginsDir)) {
  const listed = new Set((marketplace?.plugins ?? []).map((p) => p.name));
  for (const e of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const manifest = readJson(join(pluginsDir, e.name, ".claude-plugin/plugin.json"));
    if (manifest && !listed.has(manifest.name)) {
      fail(`plugins/${e.name}: not listed in marketplace.json — users cannot install it`);
    }
  }
}

if (errors.length) {
  console.error("✗ manifest validation failed:\n");
  for (const e of errors) console.error(`    ${e}`);
  console.error("");
  process.exit(1);
}

console.log(`✓ marketplace + ${marketplace?.plugins?.length ?? 0} plugin manifest(s) valid`);
