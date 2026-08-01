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

/** Every shipped file — markdown, module, or launcher — paired with the plugin root it belongs to. */
function shippedFiles() {
  const out = [];
  const walk = (root, dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "templates" && e.name !== "node_modules") walk(root, p);
      } else if (/\.(md|mjs)$/.test(e.name) || dir.endsWith("/bin")) {
        out.push({ root, file: p });
      }
    }
  };
  for (const entry of readdirSync(PLUGINS, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(join(PLUGINS, entry.name), join(PLUGINS, entry.name));
  }
  return out;
}

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
  const gates = (file) => [...readFileSync(file, "utf8").matchAll(/gate\("(harness-[\w-]+)"/g)].map((m) => m[1]);
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

// Every instruction the harness ships must name a command the reader actually has.
//
// The harness grew inside one repository and was lifted out. What it carried with it were that
// repo's PATHS, stated as if universal: scanners telling adopters to run `node scripts/dupe-scan.mjs
// --update`, athletes told to follow `.claude/skills/decompose/SKILL.md`, and `harness-ship` — the
// athlete's LAST command — invoking `node scripts/incident-scan.mjs` at runtime. None of those exist
// in an install. Every one of them reads as authoritative.
//
// Scoped by CATEGORY, not enumeration, because the enumerated version is what failed: the athletes
// were repointed at `harness-*` commands weeks ago and these survived by not being in that list.
const STALE = [
  { re: /node\s+scripts\/[\w-]+\.mjs/, why: "pre-plugin scanner path — use the `harness-*` command" },
  { re: /scripts\/ship\.sh/, why: "pre-plugin ship path — use `harness-ship`" },
  { re: /\.claude\/skills\/[\w-]+/, why: "in-repo skill path — use the `/plugin:skill` invocation" },
];

test("no shipped file tells the reader to run something they do not have", () => {
  const offences = [];
  for (const { root, file } of shippedFiles()) {
    const body = readFileSync(file, "utf8");
    for (const rule of STALE) {
      const hit = body.match(rule.re);
      if (hit) offences.push(`${file.slice(root.length - 12)}: "${hit[0]}" — ${rule.why}`);
    }
  }
  assert.deepEqual(offences, [], `shipped instructions naming paths an adopter does not have:\n  ${offences.join("\n  ")}`);
});

// Every `harness-*` command a shipped doc names must be a launcher that exists.
//
// Prose is the largest ungated surface in this repository and the first one a new contributor reads.
// The STALE-path gate above catches instructions phrased the OLD way; nothing caught an instruction
// phrased the new way that names a command nobody shipped — a plausible-looking `harness-standing`
// in a drill resolves to "command not found" for the reader, and to nothing at all for any test.
//
// This is the planted-violation discipline finally pointed at documentation: a doc naming a command
// is making a promise, and a promise nothing checks is the definition of drift. Scoped by category,
// so a drill written next year is covered without anyone remembering to extend a list.
//
// HONEST LIMIT: this checks the BINARY, not its flags. `harness-standing --zonig` still passes here.
// Flag-level checking needs each tool to describe its own interface, which none of them do yet — and
// claiming coverage this does not have would be worse than the gap.
test("every harness-* command named in a shipped doc is a launcher that exists", () => {
  const launchers = new Set(
    readdirSync(PLUGINS, { withFileTypes: true })
      .filter((p) => p.isDirectory())
      .flatMap((p) => {
        try {
          return readdirSync(join(PLUGINS, p.name, "bin"));
        } catch {
          return []; // a plugin need not ship launchers
        }
      }),
  );
  assert.ok(launchers.size > 0, "no launchers found at all — this test is reading the wrong tree");

  const missing = [];
  for (const { root, path } of shippedMarkdown()) {
    for (const m of readFileSync(path, "utf8").matchAll(/\bharness-[a-z][a-z-]*\b/g)) {
      // `harness-core` and `harness-gates` are the PLUGINS, named constantly in prose and in
      // `/plugin:skill` invocations. They are not commands and must not be required to be.
      if (m[0] === "harness-core" || m[0] === "harness-gates") continue;
      if (!launchers.has(m[0])) missing.push(`${path.slice(root.length - 12)}: ${m[0]}`);
    }
  }
  assert.deepEqual(
    [...new Set(missing)],
    [],
    `shipped docs name commands no plugin ships:\n  ${[...new Set(missing)].join("\n  ")}\n\n` +
      "Ship the launcher, or stop naming it. A reader who types this gets 'command not found'.",
  );
});

// The repository's OWN contributor-facing files must not name commands it does not have.
//
// The gate above covers `plugins/**` — what an adopter receives. It does not cover `.github/` or the
// root, which is where a NEW CONTRIBUTOR actually starts: the pull-request template is the first
// procedural text a first-timer reads, and it told everyone to run
// `node scripts/sync-versions.mjs --check`, a file that has never existed in this repository. The
// shipped template says `npm run verify` and is correct; the local copy drifted and nothing looked.
//
// That is the same defect class as the shipped-command gate, one directory over, and the reason it
// survived is instructive: the scanner was scoped to the artefact we distribute rather than to the
// artefact we hand people. A stale command in a PR template is worse than one in a plugin doc — the
// reader is at their least confident and most likely to conclude the failure is theirs.
test("no contributor-facing file at the repo root names a command this repo does not have", () => {
  const scripts = new Set(Object.keys(JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).scripts ?? {}));
  const docs = [
    ...readdirSync(REPO).filter((f) => f.endsWith(".md")).map((f) => join(REPO, f)),
    ...(existsSync(join(REPO, ".github"))
      ? readdirSync(join(REPO, ".github")).filter((f) => f.endsWith(".md")).map((f) => join(REPO, ".github", f))
      : []),
  ];

  const broken = [];
  for (const file of docs) {
    const body = readFileSync(file, "utf8");
    for (const m of body.matchAll(/node\s+(scripts\/[\w.-]+\.mjs)/g)) {
      if (!existsSync(join(REPO, m[1]))) broken.push(`${file.replace(REPO, ".")}: node ${m[1]} — no such file`);
    }
    for (const m of body.matchAll(/`npm run ([\w:-]+)`/g)) {
      if (!scripts.has(m[1])) broken.push(`${file.replace(REPO, ".")}: npm run ${m[1]} — not in package.json`);
    }
  }
  assert.deepEqual(
    [...new Set(broken)],
    [],
    `contributor-facing docs name commands that do not exist:\n  ${[...new Set(broken)].join("\n  ")}\n\n` +
      "The reader of these is usually new and will assume the failure is theirs.",
  );
});

// A relative link in a shipped doc must resolve inside the plugin that ships it.
//
// `ENGINEERING.md` shipped with links to `adr/README.md`, `../.github/pull_request_template.md`, and
// `LIVING-UNIVERSE.md` — three files that exist in the repository the harness grew in and in no
// install anywhere. A dead link in a doc is invisible until someone follows it, and the someone is
// usually an adopter deciding whether this thing is serious.
//
// Same category shape as the ${CLAUDE_PLUGIN_ROOT} gate above: every relative reference, in every
// shipped file, must resolve where it is shipped. Absolute URLs are fine — they are the correct way
// to point at something outside the plugin, which is exactly what a repository-only doc is.
test("every relative link in a shipped doc resolves inside its plugin", () => {
  const dead = [];
  for (const { root, file } of shippedFiles()) {
    if (!file.endsWith(".md")) continue;
    for (const m of readFileSync(file, "utf8").matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|\/)/.test(target)) continue; // absolute is the right way out
      if (existsSync(join(dirname(file), target))) continue;
      dead.push(`${file.slice(root.length - 12)} → ${target}`);
    }
  }
  assert.deepEqual(
    dead,
    [],
    `shipped docs link to files an install does not have:\n  ${dead.join("\n  ")}\n\n` +
      "Point at an absolute URL, or say the thing inline. A doc that ships must stand alone.",
  );
});

// Every catalogued skeleton must name where it stops.
//
// Rule 5 of the metaphor rubric, enforced rather than recommended: a metaphor whose breaking point
// nobody has named cannot be over-driven, because nobody knows where the edge is. That failure has a
// name in the catalog — METAPHOR CAPTURE, driving decisions past the isomorphic region because the
// analogy is still producing fluent answers — and it is more dangerous for a skeleton than a skin,
// since a wrong skeleton still produces plausible architecture.
//
// Same shape as the lessons ledger: an entry missing its PREVENTION is a war story, and an entry
// here missing its breaking point is an anecdote.
test("every catalogued metaphor names its breaking point", () => {
  const doc = readFileSync(join(PLUGINS, "harness-core/docs/METAPHORS.md"), "utf8");
  const catalog = doc.slice(doc.indexOf("## The catalog"));
  const entries = catalog.split(/^### /m).slice(1);
  assert.ok(entries.length >= 5, "the catalog parse found too few entries to be reading it right");
  const unbounded = entries
    .filter((e) => !/\*\*Breaks when:\*\*/.test(e))
    .map((e) => e.split("\n")[0].trim());
  assert.deepEqual(
    unbounded,
    [],
    `catalogued without a stated breaking point:\n  ${unbounded.join("\n  ")}\n\n` +
      "A skeleton nobody has bounded is the one that quietly captures a decision later.",
  );
});
