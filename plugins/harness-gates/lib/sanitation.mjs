#!/usr/bin/env node
// CONFIG RATCHETS, THE SAME WAY DEBT DOES.
//
//   harness-sanitation            # verdict
//   harness-sanitation --update   # ratchet the budget DOWN (never up)
//
// THE HOLE THIS CLOSES. Synthesis without limits is not actually safer than hand-written config: the
// override API is unrestricted, so any consumer can turn any rule off and the generator will happily
// emit the weaker file every time. Documented, first-class escape hatches ARE the path bad config
// creeps in — which makes "extensible" and "principled" look like opposites.
//
// They are not, and the resolution is the primitive this project already runs on: improvement in one
// direction only. Three tiers, and the tier assignment is DATA that ships with the harness and can be
// read, not a judgment buried in code:
//
//   LOCKED     — cannot be weakened. Checked during synthesis, fails loudly with a named reason.
//                Kept deliberately small: every entry is a claim that no repository, ever, has a good
//                reason to differ, and most claims like that are wrong.
//   RATCHETED  — may be tightened, never loosened. Budgeted and grandfathered, exactly like debt.
//   FREE       — the repository's own. Paths, exemptions, deploy target. Most of the surface.
//
// AND IT GRANDFATHERS, which is not negotiable. A repository whose config is weaker than the harness
// would write gets today's state frozen as its baseline, never a red build on day one. A config gate
// is the single easiest gate to switch off, and one that opens by condemning work somebody already
// shipped will be switched off before it has prevented anything.
//
// THE LOOP RUNS BOTH WAYS. A consumer fighting the same locked setting repeatedly is evidence the
// PRINCIPLE is wrong, not the repository — so a refusal is worth recording as a candidate against the
// tier table itself. Nothing here is dictated permanently; it is dictated until evidence says
// otherwise.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readBudget, writeBudget } from "./descriptor.mjs";

/** Read a nested value by dotted path — `linter.enabled`. */
export const at = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * LOCKED — principles a consumer may not weaken.
 *
 * Short on purpose. Each entry asserts that no repository has a legitimate reason to differ, and the
 * cost of being wrong is a synthesis that refuses to run in somebody else's project.
 */
export const LOCKED = [
  {
    file: "biome.json",
    path: "linter.enabled",
    expect: true,
    why: "a lint config with the linter switched off is a green check that measures nothing",
  },
  {
    file: "biome.json",
    path: "formatter.enabled",
    expect: true,
    why: "formatting is what makes a diff reviewable; disabling it moves noise into every future PR",
  },
];

/** Every rule set to `"off"` in a biome config, including inside `overrides`. */
export function disabledRules(config) {
  const found = [];
  const walk = (node, trail) => {
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (v === "off") found.push([...trail, k].join("."));
      else if (typeof v === "object") walk(v, [...trail, k]);
    }
  };
  walk(config?.linter?.rules, ["linter.rules"]);
  for (const [i, o] of (config?.overrides ?? []).entries()) walk(o?.linter?.rules, [`overrides[${i}]`]);
  return found;
}

/** Locked settings the rendered config violates. Files that are absent are skipped, never assumed to pass. */
export function lockedViolations(root, locked = LOCKED) {
  const cache = new Map();
  const load = (f) => {
    if (!cache.has(f)) {
      const p = join(root, f);
      cache.set(f, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
    }
    return cache.get(f);
  };

  const out = [];
  for (const rule of locked) {
    const config = load(rule.file);
    if (config === null) continue; // not present is UNMEASURED, and silence here is honest
    const actual = at(config, rule.path);
    if (actual !== rule.expect) out.push({ ...rule, actual });
  }
  return out;
}

/** The ratcheted dimension: how many rules this repo has switched off. Lower is stricter. */
export function measure(root) {
  const p = join(root, "biome.json");
  if (!existsSync(p)) return { measured: false, why: "no biome.json — nothing to measure" };
  const config = JSON.parse(readFileSync(p, "utf8"));
  const off = disabledRules(config);
  return { measured: true, off, count: off.length, locked: lockedViolations(root) };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("sanitation.mjs")) {
  const ROOT = process.cwd();
  const report = measure(ROOT);

  if (!report.measured) {
    console.log(`\n⚖ Sanitation — ${report.why} (unmeasured, not clean)\n`);
    process.exit(0);
  }

  // GRANDFATHER. No committed budget means today's number becomes the baseline, so an existing
  // repository is never condemned for config it shipped before this gate existed.
  const budget = readBudget(ROOT, "config", { disabledRules: report.count });

  if (process.argv.includes("--update")) {
    const next = { disabledRules: Math.min(budget.disabledRules, report.count) };
    writeBudget(ROOT, "config", next);
    console.log(`config-budget.json updated — disabledRules=${next.disabledRules} (only lowers).`);
    process.exit(0);
  }

  console.log("\n⚖ Sanitation — the principles a consumer may not quietly weaken\n");

  for (const v of report.locked) {
    console.log(`  ✗ LOCKED  ${v.file} → ${v.path} is ${JSON.stringify(v.actual)}, must be ${JSON.stringify(v.expect)}`);
    console.log(`            ${v.why}`);
  }

  const over = report.count > budget.disabledRules;
  console.log(
    `  ${over ? "✗" : "·"} RATCHET  ${report.count} rule(s) disabled (budget ${budget.disabledRules})`,
  );
  if (over) for (const r of report.off) console.log(`            · ${r}`);

  if (report.locked.length || over) {
    console.log(`
  Fix at the finding, never at the number. A locked setting that a repository genuinely needs to
  differ on is evidence the PRINCIPLE is wrong — promote that upstream rather than working around it
  here. The budget only ever lowers: \`harness-sanitation --update\` after removing an exemption.
`);
    process.exit(1);
  }
  console.log("");
}
