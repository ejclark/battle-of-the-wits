// MERGING INTO FILES THE REPO ALREADY OWNS.
//
// Split out of bootstrap.mjs when the architecture gate flagged it at 275 lines doing several jobs.
// This one is genuinely distinct: writing a NEW file is trivial, while folding the harness's needs
// into a file the project already maintains is where a bootstrap either earns trust or destroys it.
//
// The rule both functions follow: **what the repo already decided always wins.** An existing script,
// an existing ignore rule, an existing dependency pin — those are decisions someone made, and a tool
// that silently overwrites them is worse than a tool that does nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { NPM_STUB_TEST } from "./configs.mjs";

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
  if (!existsSync(path)) return { missing: true, scripts: [], devDependencies: [], replaced: [] };

  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.scripts ??= {};
  pkg.devDependencies ??= {};
  const added = { scripts: [], devDependencies: [], replaced: [] };

  for (const [k, v] of Object.entries(scripts)) {
    // A placeholder is the ABSENCE of a decision wearing the shape of one. `npm init` writes a `test`
    // script that fails on purpose; respecting it as a choice is what left a cold adoption's first
    // `verify` red. Matched exactly, so a real script an adopter wrote is still never overruled.
    const placeholder = k === "test" && NPM_STUB_TEST.test(pkg.scripts[k] ?? "");
    if (pkg.scripts[k] === undefined || placeholder) {
      pkg.scripts[k] = v;
      (placeholder ? added.replaced : added.scripts).push(k);
    }
  }
  for (const [k, v] of Object.entries(devDependencies)) {
    if (pkg.devDependencies[k] === undefined && pkg.dependencies?.[k] === undefined) {
      pkg.devDependencies[k] = v;
      added.devDependencies.push(k);
    }
  }

  if (!dryRun && (added.scripts.length || added.devDependencies.length || added.replaced.length)) {
    writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  return { missing: false, ...added };
}

/**
 * Fold the harness status line into `.claude/settings.json`.
 *
 * Same rule as the two above, and the reason it belongs here rather than in the bootstrap's own
 * body: `settings.json` is a file the project owns and that carries HOOKS, which are code execution.
 * Rewriting it wholesale would be the single most destructive thing this tool could do — so the
 * merge reads, sets one key, and writes back, leaving everything else byte-for-byte.
 *
 * The status line is written into the PROJECT's `.claude/` rather than shipped as a plugin file
 * because a plugin's own settings.json accepts only `agent` and `subagentStatusLine`, never the
 * main `statusLine`.
 */
export function mergeClaudeSettings(root, { dryRun = false, force = false } = {}) {
  const path = join(root, ".claude/settings.json");
  const settings = (() => {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return {};
    }
  })();
  if (settings.statusLine !== undefined && !force) {
    return { skipped: ".claude/settings.json \u2192 statusLine (already set)" };
  }
  settings.statusLine = { type: "command", command: "node .claude/harness-statusline.mjs" };
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
  }
  return { wrote: ".claude/settings.json \u2192 statusLine" };
}
