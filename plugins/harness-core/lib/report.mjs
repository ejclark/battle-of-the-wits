#!/usr/bin/env node
// FIELD REPORT — hand the harness's own failures back to the people who can fix them, for free.
//
//   harness-report                 # compose the report, show exactly what it contains
//   harness-report --url           # the prefilled issue URL only
//   harness-report --json          # for a caller
//
// THE PROBLEM. This harness runs in repositories nobody here can see, and that is where its real
// defects live — the cold-start failures found this week were all invisible from inside this
// repository and obvious from one run outside it. Every adopter hitting one of those is holding
// information that cannot be obtained any other way, and today it evaporates.
//
// THREE CONSTRAINTS, and each one rules out the obvious design:
//
//   1. IT MUST COST NOTHING. An adopter's tokens are theirs. So this is a SCRIPT, not a prompt —
//      every field below is read from files the harness already wrote, and no model is asked to
//      summarise anything. Zero tokens, zero seconds of anyone's attention. A feedback channel that
//      bills the person giving the feedback is a feedback channel nobody uses twice.
//
//   2. IT MUST NOT HOLD A CREDENTIAL. A token that can write to another repository's issues, shipped
//      inside a plugin, is exactly the thing this project refuses to build. So nothing is SENT. This
//      composes a prefilled URL and stops; the adopter presses the button, on their own account,
//      having read it. Consent by construction rather than by policy.
//
//   3. IT MUST NOT LEAK. An adopter's repository is not ours to describe. The rule is COUNTS AND
//      SHAPES, NEVER NAMES — how many files are over budget, never which; that a spec suffix is
//      non-default, never what it is. This is the roster's closed-schema discipline applied to a
//      different exit: you cannot leak a field no code reads, and a redactor that filters a
//      free-form blob is one regex away from failing open.
//
// WHAT IT IS FOR, precisely: the harness misbehaving. Not the adopter's code, not their velocity,
// not anything about the people working there. A gate that could not measure, a bootstrap that wrote
// something wrong, a refusal that fired when it should not have.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GATES, readJson } from "./state.mjs";

const ISSUES = "https://github.com/ejclark/dungeon-crawler/issues/new";

/**
 * Everything the report may contain, and nothing else.
 *
 * This is a CLOSED projection, deliberately shaped so that adding a leak requires editing this
 * function rather than forgetting a filter somewhere downstream. Every value here is a count, a
 * boolean, or a value drawn from a fixed vocabulary the harness itself defines.
 */
export function fieldReport(root, env = process.env) {
  const desc = readJson(root, "harness.json");
  const pkg = readJson(root, "package.json");

  // Which budgets exist and how big they are. The COUNT of entries is a useful signal about scale;
  // the KEYS are the adopter's directory structure and are none of our business.
  const budgets = {};
  for (const g of GATES) {
    const b = readJson(root, `${g}-budget.json`);
    budgets[g] = b ? Object.keys(b).filter((k) => !k.startsWith("_why_")).length : null;
  }

  return {
    // Shape, not identity. Whether the repo departs from the defaults is the portability signal that
    // matters; what it departed TO is theirs.
    layout: {
      hasDescriptor: Boolean(desc),
      sourceExt: desc?.sourceExt ?? null, //           a fixed vocabulary — ".ts" / ".js" / ".py"
      defaultSourceDir: (desc?.sourceDir ?? "src") === "src",
      defaultTestDir: (desc?.testDir ?? "tests") === "tests",
      customSpecSuffix: Boolean(desc?.specSuffix) && desc.specSuffix !== ".spec.ts",
      exclusions: (desc?.exclude ?? []).length,
    },
    toolchain: {
      node: process.version,
      platform: process.platform,
      hasTsconfig: existsSync(join(root, "tsconfig.json")),
      // The one script whose CONTENT matters, and only as a category: which runner the gates had to
      // match. Everything else in `scripts` is the adopter's business.
      runner: /\bnode\s+--test\b/.test(pkg?.scripts?.test ?? "") ? "node --test" : pkg?.scripts?.test ? "other" : "none",
      hasVerify: Boolean(pkg?.scripts?.verify),
      gitRepo: existsSync(join(root, ".git")),
    },
    budgets,
    // Counts by kind. The ledger already refuses identity fields; this refuses everything else too,
    // because a record's free-form payload is the adopter's and was never meant to travel.
    ledger: (() => {
      const file = join(root, desc?.metricsFile ?? "docs/metrics.jsonl");
      if (!existsSync(file)) return null;
      const kinds = {};
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const kind = JSON.parse(line).kind;
          if (typeof kind === "string") kinds[kind] = (kinds[kind] ?? 0) + 1;
        } catch {
          // A corrupt line is a corrupt record, not a reason to stop counting.
        }
      }
      return kinds;
    })(),
    harnessVersion: env.CLAUDE_PLUGIN_ROOT ? "installed" : "working tree",
  };
}

/** The issue body. Markdown, and every substitution comes from the closed projection above. */
export function issueBody(report, what = "") {
  const row = (k, v) => `| ${k} | ${v === null ? "—" : v} | `;
  return [
    "<!-- Composed by `harness-report`. Nothing was sent anywhere; you are filing this yourself. -->",
    "",
    "### What the harness did",
    "",
    what || "_Describe what happened — what you ran, what you expected, what you got instead._",
    "",
    "### Environment",
    "",
    "| | |",
    "|---|---|",
    row("node", report.toolchain.node),
    row("platform", report.toolchain.platform),
    row("test runner", report.toolchain.runner),
    row("source extension", report.layout.sourceExt),
    row("default layout", `${report.layout.defaultSourceDir ? "src" : "custom"} / ${report.layout.defaultTestDir ? "tests" : "custom"}`),
    row("custom spec suffix", report.layout.customSpecSuffix),
    row("tsconfig", report.toolchain.hasTsconfig),
    row("verify script", report.toolchain.hasVerify),
    row("git repository", report.toolchain.gitRepo),
    row("descriptor", report.layout.hasDescriptor),
    row("exclusions", report.layout.exclusions),
    "",
    "### Budgets (entry counts)",
    "",
    "| gate | entries |",
    "|---|---|",
    ...Object.entries(report.budgets).map(([g, n]) => `| ${g} | ${n === null ? "not frozen" : n} |`),
    "",
    report.ledger ? `### Ledger\n\n${Object.entries(report.ledger).map(([k, n]) => `- ${k}: ${n}`).join("\n")}` : "",
    "",
    "---",
    "_Counts and shapes only — no file names, no paths, no code, no identities._",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/** The prefilled URL. Nothing is transmitted by building one — it is a link. */
export function issueUrl(report, { title = "", what = "" } = {}) {
  const q = new URLSearchParams({
    labels: "snag",
    title: title || "snag: ",
    body: issueBody(report, what),
  });
  return `${ISSUES}?${q}`;
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("report.mjs")) {
  const argv = process.argv.slice(2);
  const at = (flag) => (argv.indexOf(flag) >= 0 ? argv[argv.indexOf(flag) + 1] : "");
  const report = fieldReport(process.cwd());
  const opts = { title: at("--title"), what: at("--what") };

  if (argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else if (argv.includes("--url")) console.log(issueUrl(report, opts));
  else {
    // Show the CONTENTS before the link, always. A report someone files without reading is not
    // consent, it is a habit — and the whole justification for this design is that they read it.
    console.log(`\n${issueBody(report, opts.what)}\n`);
    console.log("─".repeat(78));
    console.log("\n  Nothing above has been sent. This is what WOULD be filed, and you are filing it.\n");
    console.log(`  ${issueUrl(report, opts)}\n`);
    console.log("  Costs no tokens — every value here was read from files already on your disk.\n");
  }
}
