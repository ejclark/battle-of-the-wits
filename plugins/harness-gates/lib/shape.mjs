#!/usr/bin/env node
// SHAPE, NOT CONTENT — the validator for a repository's contextual systems.
//
//   harness-shape-scan            # report
//   harness-shape-scan --json     # for a caller
//
// A repository carries systems the harness cares about the STRUCTURE of and must never care about
// the CONTENTS of: `IDEAS.md`, `LESSONS.md`, a backlog, an ADR directory. The split is the whole
// point and it decides what may travel upstream:
//
//   · A NEW IDEA is content. It is the repository's, it is none of the harness's business, and a
//     hundred of them change nothing about the system that holds them.
//   · A NEW FIELD, SECTION OR CONVENTION is shape. Somebody has extended the system itself, and that
//     is exactly the thing worth asking whether every other repository should have.
//
// SO THIS REPORTS RATHER THAN REFUSES. An unknown section is not a violation — it is a **promotion
// candidate**, and failing a build over it would teach people to stop extending their own systems,
// which is the opposite of what it is for. Only a MISSING required field is a defect, because that
// one breaks a reader that has to parse the file.
//
// The detector is deliberately structural. It never reads prose, never counts entries, and cannot
// tell you what an idea says — which is what makes "content is the repo's" a property of the code
// rather than a promise in a document.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Where the generated declaration lives — written by the projen ContextualSystems component. */
export const SHAPE_FILE = "harness-shape.json";

/** `### heading` blocks, each with the text that follows it up to the next one of equal depth. */
export function entriesOf(text, depth = 3) {
  const marker = `${"#".repeat(depth)} `;
  const out = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (line.startsWith(marker)) {
      if (current) out.push(current);
      current = { title: line.slice(marker.length).trim(), body: "" };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) out.push(current);
  return out;
}

/** `**NAME:**` field labels used inside an entry. */
export const fieldsIn = (body) => [...body.matchAll(/\*\*([A-Z][A-Z ]*[A-Z]|[A-Z]):\*\*/g)].map((m) => m[1]);

/** `## Heading` labels at the top level of a document. */
export const sectionsIn = (text) =>
  text
    .split("\n")
    .filter((l) => /^## \S/.test(l))
    .map((l) => l.slice(3).trim());

/**
 * Compare one file against its declared shape.
 *
 * `missing` is a defect — a required field absent from an entry breaks anything that parses it.
 * `unknown` is a CANDIDATE, never a failure: somebody extended the system, and the only question is
 * whether that extension should travel.
 */
export function validateShape(text, schema = {}) {
  const required = schema.fields ?? [];
  const knownFields = new Set([...required, ...(schema.optionalFields ?? [])]);
  const knownSections = new Set(schema.sections ?? []);

  const missing = [];
  const unknown = [];

  for (const entry of entriesOf(text, schema.entryDepth ?? 3)) {
    const present = new Set(fieldsIn(entry.body));
    for (const f of required) if (!present.has(f)) missing.push({ entry: entry.title, field: f });
    for (const f of present) {
      if (knownFields.size && !knownFields.has(f)) unknown.push({ kind: "field", entry: entry.title, name: f });
    }
  }

  for (const s of sectionsIn(text)) {
    if (knownSections.size && !knownSections.has(s)) unknown.push({ kind: "section", name: s });
  }

  return { missing, unknown };
}

/** Read the generated declaration. Absent means the repo declares no contextual systems — not an error. */
export function declaredSystems(root) {
  const p = join(root, SHAPE_FILE);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")).systems ?? {};
}

/** Validate every declared system. A declared file that does not exist is reported, never assumed clean. */
export function scan(root) {
  const systems = declaredSystems(root);
  if (systems === null) return { measured: false, why: `no ${SHAPE_FILE} — nothing declared to check` };

  const results = [];
  for (const [path, schema] of Object.entries(systems)) {
    const full = join(root, path);
    if (!existsSync(full)) {
      results.push({ path, absent: true, missing: [], unknown: [] });
      continue;
    }
    const text = statSync(full).isDirectory()
      ? readdirSync(full)
          .filter((f) => f.endsWith(".md"))
          .map((f) => readFileSync(join(full, f), "utf8"))
          .join("\n")
      : readFileSync(full, "utf8");
    results.push({ path, absent: false, ...validateShape(text, schema) });
  }
  return { measured: true, results };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("shape.mjs")) {
  const root = process.cwd();
  const report = scan(root);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.measured && report.results.some((r) => r.missing.length || r.absent) ? 1 : 0);
  }

  // DEGRADES HONESTLY. A repo that declares nothing is not a clean repo, it is an unmeasured one,
  // and saying "0 problems" here would be the false green every other gate refuses to produce.
  if (!report.measured) {
    console.log(`\n▤ Shape scan — ${report.why}\n`);
    process.exit(0);
  }

  console.log("\n▤ Shape scan — the structure of this repo's contextual systems\n");
  let defects = 0;
  let candidates = 0;

  for (const r of report.results) {
    if (r.absent) {
      console.log(`  ✗ ${r.path} — declared but not present`);
      defects++;
      continue;
    }
    for (const m of r.missing) {
      console.log(`  ✗ ${r.path} — "${m.entry}" is missing **${m.field}:**`);
      defects++;
    }
    for (const u of r.unknown) {
      const where = u.kind === "section" ? `section "${u.name}"` : `field **${u.name}:** in "${u.entry}"`;
      console.log(`  ⋯ ${r.path} — ${where} is not in the declared shape`);
      candidates++;
    }
    if (!r.missing.length && !r.unknown.length) console.log(`  · ${r.path} — conforms`);
  }

  if (candidates) {
    console.log(`
  ${candidates} shape extension(s) found. These are NOT failures — somebody extended a system, and
  the only question is whether the extension should travel to every other repository. Promote it
  with /upstream, or leave it as this repo's own. Adding entries never appears here; only changing
  the structure that holds them does.`);
  }
  if (defects) console.log(`\n✗ ${defects} structural defect(s) — a reader that parses these files would break.\n`);
  else console.log("");

  process.exit(defects ? 1 : 0);
}
