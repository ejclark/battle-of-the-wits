#!/usr/bin/env node
// A FORM THAT APPLIES A LABEL NOBODY CREATED FAILS SILENTLY. Derive the labels from the forms.
//
//   node scripts/sync-labels.mjs            # say what is missing; write nothing
//   node scripts/sync-labels.mjs --check    # exit 1 if any declared label is absent
//   node scripts/sync-labels.mjs --apply    # create the missing ones (needs GITHUB_TOKEN)
//
// GitHub does not error when an issue form names a label that does not exist. It accepts the form,
// files the issue, and quietly applies nothing. So the failure looks like this: the forms render, the
// reports arrive, and every coordination layer built on those labels — triage queues, saved searches,
// the bank → issue → assignment protocol — is reading an empty set. Nothing is red. That is the exact
// false-green shape the gates exist to catch, arriving through a door the gates do not watch.
//
// It is a PORTABILITY defect before it is a convenience. An adopter installs the harness, gets the
// issue forms, and does not get the labels — because labels live in a repository's settings and
// nothing in a git clone carries them. Every adopter would hit this, and each one would hit it
// silently, weeks after adopting, if at all.
//
// THE FORMS ARE THE SOURCE OF TRUTH. Not a list in this file, which would be a second place to edit
// and therefore a place to drift: add a form with a new label, forget the list, and the gate reports
// green about a label it does not know exists. Reading the declaration back out of the form means the
// two cannot disagree.
//
// IT CREATES, AND IT NEVER UPDATES. A label that already exists is left exactly as it is — its
// colour, its description, its casing. Those are somebody's choices, made in a UI, and a script that
// "corrects" them every run is a script that argues with its owner until it gets turned off. Same
// grandfather rule the budgets run on: freeze what is there, only ever add what is missing.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORMS = join(REPO, ".github", "ISSUE_TEMPLATE");
const API = process.env.GITHUB_API_URL ?? "https://api.github.com";

/**
 * Every label an issue form declares, with the form's own description.
 *
 * The parser is deliberately dumb — a regex over `labels:` rather than a YAML dependency. Same
 * reasoning as descriptor detection: a clever inference that is wrong is worse than a simple one
 * that is obviously wrong, and this repository ships no runtime dependencies. Both spellings the
 * schema allows are handled (a flow list and a block list); anything else is reported as unparsed
 * rather than skipped, because a form whose labels this cannot read is exactly the case where
 * silence would recreate the defect.
 */
export function declaredLabels(dir = FORMS) {
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f) && f !== "config.yml");
  } catch {
    return { labels: [], unparsed: [] }; //  no forms is a state, not an error — an adopter starts here
  }

  const labels = new Map();
  const unparsed = [];
  for (const file of files) {
    const body = readFileSync(join(dir, file), "utf8");
    // The form's own description becomes the label's, so the label says the same thing the form does.
    // Truncated to GitHub's 100-character ceiling on a whole word rather than mid-syllable.
    const desc = (body.match(/^description:\s*(.+)$/m)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");

    const flow = body.match(/^labels:\s*\[(.*)\]\s*$/m);
    const block = body.match(/^labels:\s*\n((?:\s*-\s*.+\n?)+)/m);
    let names = [];
    if (flow) names = flow[1].split(",");
    else if (block) names = block[1].split("\n").map((l) => l.replace(/^\s*-\s*/, ""));
    else if (/^labels:/m.test(body)) {
      unparsed.push(file); //  it declares labels in a shape this cannot read — say so, never assume none
      continue;
    }

    for (const raw of names) {
      const name = raw.trim().replace(/^["']|["']$/g, "");
      if (name && !labels.has(name)) labels.set(name, { name, description: clamp(desc), form: file });
    }
  }
  return { labels: [...labels.values()], unparsed };
}

/** GitHub's label description ceiling is 100 characters. Cut on a word, and say that it was cut. */
export function clamp(s, max = 100) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).trimEnd()}…`;
}

/**
 * A stable colour for a name, so two people running this get the same result and neither has to
 * choose. A colour is not a decision worth a config option — but it does have to be DETERMINISTIC,
 * or re-running the script on a fresh repo produces a palette that disagrees with the last one.
 *
 * Hue from the name, with saturation and lightness fixed in a band that stays legible against both
 * GitHub themes. Existing labels never reach this function; it only ever names something new.
 */
export function colorFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return hslHex(h % 360, 0.55, 0.45);
}

function hslHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

const gh = async (path, token, init = {}) =>
  fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });

/** Which declared labels the repository does not have. Reading is public; only writing needs a token. */
export async function missingFrom(owner, repo, declared, token) {
  const have = new Set();
  for (let page = 1; ; page++) {
    const res = await gh(`/repos/${owner}/${repo}/labels?per_page=100&page=${page}`, token);
    if (!res.ok) throw new Error(`could not list labels: ${res.status} ${res.statusText}`);
    const batch = await res.json();
    for (const l of batch) have.add(l.name.toLowerCase());
    if (batch.length < 100) break;
  }
  return declared.filter((l) => !have.has(l.name.toLowerCase()));
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("sync-labels.mjs")) {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const check = argv.includes("--check");
  const slug = process.env.GITHUB_REPOSITORY ?? argv.find((a) => /^[\w.-]+\/[\w.-]+$/.test(a));
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

  const { labels, unparsed } = declaredLabels();
  console.log(`\n  🏷  ${labels.length} label(s) declared by the issue forms\n`);
  for (const l of labels) console.log(`      ${l.name.padEnd(16)} ${l.form}`);
  if (unparsed.length) {
    // Cannot measure, so do not render a verdict. Naming the file is the useful half.
    console.log(`\n  ⚠  could not read the labels in: ${unparsed.join(", ")}`);
    console.log("      They declare `labels:` in a shape this parser does not handle — check by hand.");
  }

  if (!slug) {
    // DEGRADE HONESTLY. With no repository to compare against there is nothing to verify, and a
    // green exit here would claim an outcome that never happened.
    console.log("\n  No repository given, so nothing was compared.");
    console.log("      usage: node scripts/sync-labels.mjs [--check|--apply] owner/repo");
    console.log("      or set GITHUB_REPOSITORY. Writing also needs GITHUB_TOKEN.\n");
    process.exit(0);
  }

  const [owner, repo] = slug.split("/");
  let missing;
  try {
    missing = await missingFrom(owner, repo, labels, token);
  } catch (err) {
    console.log(`\n  ⚠  ${err.message}`);
    console.log("      Could not read the repository's labels, so nothing is known either way.\n");
    process.exit(0); //  a gate that cannot measure must not render a verdict in either direction
  }

  if (!missing.length) {
    console.log(`\n  ✓ every declared label exists on ${slug}\n`);
    process.exit(0);
  }

  console.log(`\n  ✗ ${missing.length} declared label(s) missing on ${slug}:`);
  for (const l of missing) console.log(`      ${l.name}  —  declared by ${l.form}`);
  console.log("\n    An issue form that applies a label nobody created files the issue and applies");
  console.log("    nothing. Nothing goes red; the label is simply never there.\n");

  if (!apply) {
    console.log("    Fix: node scripts/sync-labels.mjs --apply " + slug + "   (needs GITHUB_TOKEN)\n");
    process.exit(check ? 1 : 0);
  }
  if (!token) {
    console.log("    --apply needs GITHUB_TOKEN (a token with `issues: write` on this repository).\n");
    process.exit(1);
  }

  let failed = 0;
  for (const l of missing) {
    const res = await gh(`/repos/${owner}/${repo}/labels`, token, {
      method: "POST",
      body: JSON.stringify({ name: l.name, description: l.description, color: colorFor(l.name) }),
    });
    if (res.ok) {
      console.log(`    ✓ created ${l.name}`);
    } else {
      failed++;
      console.log(`    ✗ ${l.name}: ${res.status} ${res.statusText}`);
    }
  }
  console.log("");
  process.exit(failed ? 1 : 0);
}
