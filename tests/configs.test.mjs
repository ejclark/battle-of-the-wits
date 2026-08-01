import assert from "node:assert/strict";
import { test } from "node:test";
import { renderJscpd, renderKnip } from "../plugins/harness-core/lib/configs.mjs";

// knip and jscpd are the only two gates whose SCOPE lives in a config file rather than in the
// scanner's own code. A copied template pointed both at `src/`, so a repository declaring any other
// layout got detectors looking at a directory that may not exist — which reports a confident zero.
// An empty scope is the most dangerous wrong answer there is: it looks exactly like a clean repo.

const DESC = {
  sourceDir: "lib",
  testDir: "spec",
  sourceExt: ".js",
  specSuffix: ".test.js",
  exclude: ["lib/templates/"],
};

test("knip config follows the descriptor's layout, not src/", () => {
  const knip = JSON.parse(renderKnip(DESC));
  assert.deepEqual(knip.project, ["lib/**/*.js", "scripts/*.mjs"]);
  assert.ok(knip.entry.includes("spec/**/*.test.js"), "specs are entry points");
  assert.ok(knip.entry.includes("lib/scripts/*.js"));
  assert.deepEqual(knip.ignore, ["lib/templates/"]);
});

test("jscpd config follows the descriptor's layout, not src/", () => {
  const jscpd = JSON.parse(renderJscpd(DESC));
  assert.deepEqual(jscpd.path, ["lib"]);
  assert.ok(jscpd.ignore.includes("**/*.test.js"), "specs are excluded");
  assert.ok(jscpd.ignore.includes("lib/templates/**"), "descriptor exclusions are excluded");
});

test("jscpd never scans node_modules", () => {
  // Left unscoped, jscpd measures the whole working tree — including the lockfile against itself.
  // This harness shipped with no .jscpd.json at all for a while and did exactly that.
  assert.ok(JSON.parse(renderJscpd({})).ignore.includes("**/node_modules/**"));
});

test("an empty descriptor renders the documented defaults", () => {
  assert.deepEqual(JSON.parse(renderKnip({})).project, ["src/**/*.ts", "scripts/*.mjs"]);
  assert.deepEqual(JSON.parse(renderJscpd({})).path, ["src"]);
});

test("both render valid, newline-terminated JSON", () => {
  for (const out of [renderKnip(DESC), renderJscpd(DESC)]) {
    assert.ok(out.endsWith("\n"));
    assert.doesNotThrow(() => JSON.parse(out));
  }
});
