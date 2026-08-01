// Doctrine has to travel with the plugin that references it.
//
// A skill that points at `${CLAUDE_PLUGIN_ROOT}/docs/COACHES.md` reads that path relative to ITS OWN
// plugin. The moment a skill in one plugin references a doc shipped by another, the link resolves to
// nothing — and nothing reports it, because a dead reference in a Markdown instruction file is
// invisible until a session follows it and finds an empty path.
//
// This is the same failure class as the shellcheck glob: a reference scoped by a pattern that
// happened to be true when it was written. The gate below scopes it by category instead — EVERY
// plugin-root reference, in EVERY shipped file, must resolve inside the plugin that makes it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGINS = join(REPO, "plugins");

/** Every Markdown file shipped inside a plugin, paired with the plugin root it belongs to. */
function shippedMarkdown() {
  const out = [];
  for (const entry of readdirSync(PLUGINS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const root = join(PLUGINS, entry.name);
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".md")) out.push({ plugin: entry.name, root, path: p });
      }
    };
    walk(root);
  }
  return out;
}

test("every ${CLAUDE_PLUGIN_ROOT} reference resolves inside the plugin that makes it", () => {
  const broken = [];
  for (const { plugin, root, path } of shippedMarkdown()) {
    const body = readFileSync(path, "utf8");
    for (const m of body.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s)`"']+)/g)) {
      const target = join(root, m[1]);
      if (!existsSync(target)) {
        broken.push(`${plugin}: ${path.replace(REPO, ".")} → \${CLAUDE_PLUGIN_ROOT}/${m[1]}`);
      }
    }
  }
  assert.deepEqual(broken, [], `dead plugin-root references:\n    ${broken.join("\n    ")}`);
});

test("the doctrine ships with harness-core, not just with the repository", () => {
  // An adopter installs plugins; they do not clone this repo. Doctrine that lives only at the repo
  // root is doctrine they never receive.
  for (const doc of ["COACHES.md", "ENGINEERING.md", "OPERATING-MODEL.md", "DESCRIPTOR.md"]) {
    const shipped = join(PLUGINS, "harness-core/docs", doc);
    assert.equal(existsSync(shipped), true, `${doc} must ship inside harness-core`);
    assert.ok(statSync(shipped).size > 500, `${doc} looks like a stub rather than the real thing`);
  }
});

test("no doctrine file is duplicated between the repo root and the plugin", () => {
  // Two copies of doctrine is exactly the configuration drift this harness exists to prevent. The
  // one deliberate exception is DESCRIPTOR.md, kept at the root for web readers and asserted
  // identical below so it cannot silently diverge.
  const rootDocs = existsSync(join(REPO, "docs")) ? readdirSync(join(REPO, "docs")) : [];
  for (const doc of ["COACHES.md", "ENGINEERING.md", "OPERATING-MODEL.md"]) {
    assert.equal(rootDocs.includes(doc), false, `docs/${doc} is a second copy — one source, or none`);
  }
});

test("the DESCRIPTOR convenience copy is byte-identical to the shipped one", () => {
  const a = readFileSync(join(REPO, "docs/DESCRIPTOR.md"), "utf8");
  const b = readFileSync(join(PLUGINS, "harness-core/docs/DESCRIPTOR.md"), "utf8");
  assert.equal(a, b, "the root copy has drifted from the shipped copy — regenerate or delete it");
});

// The harness must run every gate it ships.
//
// The shipped gates template is the promise made to an adopter: install the plugins and these
// dimensions get measured. If this repository's own suite runs a smaller set, the difference is a
// blind spot in the one codebase best placed to find bugs in the gates — and it drifts silently,
// because a gate nobody wired in never fails. Scoped by category, not by enumeration: the assertion
// reads the template rather than restating its list, so a gate added there cannot be forgotten here.
test("this repository runs every gate the shipped template wires in", () => {
  const gates = (file) => [...readFileSync(file, "utf8").matchAll(/gate\("(harness-[\w-]+)"\)/g)].map((m) => m[1]);
  const promised = gates(join(PLUGINS, "harness-core/templates/specs/gates.test.mjs"));
  const kept = new Set(gates(join(REPO, "tests/arch/gates.test.mjs")));
  assert.ok(promised.length > 0, "the shipped template names no gates — the parse is wrong");
  const missing = promised.filter((g) => !kept.has(g));
  assert.deepEqual(
    missing,
    [],
    `the template promises gates this repo does not run: ${missing.join(", ")}\n` +
      "Wire them into tests/arch/gates.test.mjs and freeze their budgets, or stop shipping them.",
  );
});
