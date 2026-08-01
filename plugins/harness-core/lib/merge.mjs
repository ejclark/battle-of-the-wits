// MERGING INTO FILES THE REPO ALREADY OWNS.
//
// Split out of bootstrap.mjs when the architecture gate flagged it at 275 lines doing several jobs.
// This one is genuinely distinct: writing a NEW file is trivial, while folding the harness's needs
// into a file the project already maintains is where a bootstrap either earns trust or destroys it.
//
// The rule both functions follow: **what the repo already decided always wins.** An existing script,
// an existing ignore rule, an existing dependency pin — those are decisions someone made, and a tool
// that silently overwrites them is worse than a tool that does nothing.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Fold the harness's ignore rules into an existing .gitignore, or write one.
 *
 * Not cosmetic: the automated run ends in `git add -A`, and without this it committed the entire
 * node_modules tree on a fresh repo. Appends only the lines the repo lacks.
 */
export function mergeGitignore(root, template, { dryRun = false } = {}) {
  const path = join(root, ".gitignore");
  const needed = template.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

  if (!existsSync(path)) {
    if (!dryRun) writeFileSync(path, template);
    return { wrote: ".gitignore", added: needed.length };
  }

  const current = readFileSync(path, "utf8");
  const missing = needed.filter((l) => !current.split("\n").some((c) => c.trim() === l.trim()));
  if (!missing.length) return { skipped: ".gitignore (already covers what the harness needs)" };

  if (!dryRun) {
    writeFileSync(path, `${current.replace(/\n*$/, "")}\n\n# added by the harness\n${missing.join("\n")}\n`);
  }
  return { wrote: `.gitignore (+${missing.length} entr${missing.length === 1 ? "y" : "ies"})`, added: missing.length };
}

/**
 * Add the scripts and dev dependencies the process needs, leaving everything else untouched.
 * A project that already defines `lint` has made a choice; the template must not overrule it.
 */
export function mergePackageJson(root, { scripts, devDependencies }, { dryRun = false } = {}) {
  const path = join(root, "package.json");
  if (!existsSync(path)) return { missing: true, scripts: [], devDependencies: [] };

  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.scripts ??= {};
  pkg.devDependencies ??= {};
  const added = { scripts: [], devDependencies: [] };

  for (const [k, v] of Object.entries(scripts)) {
    if (pkg.scripts[k] === undefined) {
      pkg.scripts[k] = v;
      added.scripts.push(k);
    }
  }
  for (const [k, v] of Object.entries(devDependencies)) {
    if (pkg.devDependencies[k] === undefined && pkg.dependencies?.[k] === undefined) {
      pkg.devDependencies[k] = v;
      added.devDependencies.push(k);
    }
  }

  if (!dryRun && (added.scripts.length || added.devDependencies.length)) {
    writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  return { missing: false, ...added };
}
