// A feedback channel is an EXFILTRATION channel pointed the other way, and the only thing that makes
// it safe is that it cannot carry what it was never given.
//
// So these tests do not check that the report is useful. They plant real secrets in every input it
// reads — proprietary directory names in the descriptor, file paths and prose in the budgets, a
// customer name in a ledger record, an internal hostname in a script — and require that not one
// character of any of them reaches the output.
//
// This is the closed-projection discipline the roster already runs on, applied to a different exit.
// A redactor that filters a free-form blob is one regex away from failing open; a projection that
// only ever emits counts, booleans, and values from a fixed vocabulary cannot fail that way, because
// there is no code path that reads the dangerous field at all.
//
// The second property, equally load-bearing: **nothing is sent.** There is no network call in the
// module and no credential anywhere near it. Composing a URL transmits nothing; the adopter presses
// the button, on their own account, having read what it says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fieldReport, issueBody, issueUrl } from "../plugins/harness-core/lib/report.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const LAUNCHER = join(REPO, "plugins/harness-core/bin/harness-report");

// Every one of these is planted somewhere the report reads from. None may survive.
const SECRETS = [
  "acme-billing-core", //     a proprietary package name, in the descriptor
  "src/internal/pricing", //  a path revealing product structure, in a budget key
  "Priya Raghunathan", //     a person, in a ledger record
  "vault.acme.internal", //   an internal hostname, in a script
  "ghp_notarealtokenbutlooksit", // a credential shape, in a budget reason
  "MegaCorp", //              a customer name, in a ledger payload
];

function plantedRepo() {
  const root = mkdtempSync(join(tmpdir(), "report-"));
  mkdirSync(join(root, "docs"), { recursive: true });

  writeFileSync(
    join(root, "harness.json"),
    JSON.stringify({
      sourceDir: "packages/acme-billing-core/src",
      testDir: "packages/acme-billing-core/spec",
      sourceExt: ".ts",
      specSuffix: ".acme.spec.ts",
      exclude: ["src/internal/pricing", "vendor/MegaCorp"],
    }),
  );
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "acme-billing-core",
      scripts: { test: "vitest run", verify: "npm run lint && curl -s https://vault.acme.internal/ci", deploy: "ship-to MegaCorp" },
    }),
  );
  writeFileSync(
    join(root, "arch-budget.json"),
    JSON.stringify({
      _why_pricing: "src/internal/pricing grew because the MegaCorp contract needed it; token ghp_notarealtokenbutlooksit rotates monthly",
      "src/internal/pricing/engine.ts": 400,
      "packages/acme-billing-core/src/index.ts": 120,
    }),
  );
  writeFileSync(
    join(root, "docs/metrics.jsonl"),
    [
      JSON.stringify({ at: "2026-07-01T00:00:00Z", kind: "ratchet", file: "src/internal/pricing/engine.ts", note: "Priya Raghunathan raised it for MegaCorp" }),
      JSON.stringify({ at: "2026-07-02T00:00:00Z", kind: "ratchet", customer: "MegaCorp" }),
      JSON.stringify({ at: "2026-07-03T00:00:00Z", kind: "incident" }),
    ].join("\n"),
  );
  return root;
}

test("not one planted secret survives into the report, in any form", () => {
  const root = plantedRepo();
  const surfaces = {
    "the projection": JSON.stringify(fieldReport(root)),
    "the issue body": issueBody(fieldReport(root), "the bootstrap wrote the wrong gate flavour"),
    "the prefilled URL": issueUrl(fieldReport(root), { title: "snag: wrong gate", what: "it wrote a .ts gate" }),
  };
  for (const [where, text] of Object.entries(surfaces)) {
    const leaked = SECRETS.filter((s) => text.includes(s) || text.includes(encodeURIComponent(s)));
    assert.deepEqual(leaked, [], `${where} carries: ${leaked.join(", ")}`);
  }
});

test("what it DOES carry is the part that is actually diagnostic", () => {
  // The negative control. A projection that leaked nothing because it reported nothing would pass
  // the test above and be worthless — the whole point is that shape survives while identity does not.
  const r = fieldReport(plantedRepo());
  assert.equal(r.layout.defaultSourceDir, false, "a non-default layout is the portability signal that matters most");
  assert.equal(r.layout.defaultTestDir, false);
  assert.equal(r.layout.customSpecSuffix, true, "a custom suffix is exactly what breaks gate wiring");
  assert.equal(r.layout.exclusions, 2, "how many exclusions, never which");
  assert.equal(r.toolchain.runner, "other", "the runner CATEGORY decides which gate template is right");
  assert.equal(r.budgets.arch, 2, "budget entry counts, with the _why_ keys excluded");
  assert.deepEqual(r.ledger, { ratchet: 2, incident: 1 }, "record kinds and counts, never their payloads");
});

test("the module cannot send anything, and holds no credential", () => {
  // Constraint 2, checked structurally rather than trusted. A plugin that shipped a token able to
  // write to another repository's issues is precisely what this project refuses to build, and the
  // safe version of that refusal is having no transport at all.
  const src = readFileSync(join(REPO, "plugins/harness-core/lib/report.mjs"), "utf8");
  for (const forbidden of [/\bfetch\s*\(/, /node:https?/, /XMLHttpRequest/, /axios/, /execFileSync\(\s*["']curl/, /GITHUB_TOKEN/, /\bgh\b\s+issue/]) {
    assert.ok(!forbidden.test(src), `report.mjs contains ${forbidden} — it must compose, never transmit`);
  }
});

test("the run shows what it would file BEFORE the link, and says nothing was sent", () => {
  // Consent by construction. A report someone files without reading is a habit, not consent, and
  // reading it is the entire justification for the design.
  const out = execFileSync(LAUNCHER, ["--what", "gates went red with an empty message"], { cwd: plantedRepo(), encoding: "utf8" });
  assert.match(out, /Nothing above has been sent/);
  assert.ok(out.indexOf("### Environment") < out.indexOf("github.com"), "the link must come after the contents, never instead of them");
  assert.match(out, /Costs no tokens/, "the cost has to be stated — an adopter has no way to know otherwise");
  assert.deepEqual(SECRETS.filter((s) => out.includes(s)), []);
});

test("a repository with nothing set up still produces a filable report", () => {
  // Degrades honestly. The adopter most likely to hit a harness defect is the one whose setup did
  // not finish — a reporter that needs a working install to describe a broken one is useless exactly
  // when it is needed.
  const bare = mkdtempSync(join(tmpdir(), "bare-"));
  const r = fieldReport(bare);
  assert.equal(r.layout.hasDescriptor, false);
  assert.equal(r.ledger, null);
  assert.deepEqual(Object.values(r.budgets), [null, null, null, null, null, null]);
  assert.match(issueBody(r), /not frozen/);
  assert.match(issueUrl(r), /^https:\/\/github\.com\/ejclark\/dungeon-crawler\/issues\/new\?/);
});
