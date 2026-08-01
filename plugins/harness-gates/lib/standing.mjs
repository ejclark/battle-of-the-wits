#!/usr/bin/env node
// STANDING — the read surface over `principals.mjs`.
//
//   harness-standing                  # every principal, their evidence, and what it makes them eligible for
//   harness-standing <id>             # one principal
//   harness-standing --zoning         # the radius table, with nothing repo-specific in it
//
// Split from the model for the reason the visual ladder is split from `model.mjs`: **a view may
// never become a second source of truth.** Everything printed below comes from `principals.mjs`, so
// this file decides how standing READS and never what it IS. The moment a report computes its own
// idea of who is eligible for what, two surfaces start disagreeing about a person — which is a worse
// failure here than in a city render, because the subject of the disagreement can read it.
//
// The whole file is output, and the output is doing real work. A permission report is met by someone
// asking "am I allowed to touch this?", usually while already unsure whether they belong. Every
// line therefore states what it measured, what it did not, and what it is not claiming.
import { descriptor } from "./descriptor.mjs";
import { atLeast, defaultRef, eligibility, evidenceFor, roster, zoning } from "./principals.mjs";

const ROOT = process.cwd();

function printZoning() {
  const desc = descriptor(ROOT);
  console.log("\n  Zoning — what each tier may write. Radius is derived from harness.json, never assumed.\n");
  for (const z of zoning(desc)) console.log(`    ${z.tier.padEnd(12)} ${z.grants}`);
  console.log(`
  Layout in use:  source ${desc.sourceDir}/   specs ${desc.testDir}/   docs ${desc.docsDir}/   ideas ${desc.ideasFile}

  Zoning NARROWS what the preflight already permits; it never widens it. Workflow files, credential-
  shaped files and settings are refused to every principal including the owner — that refusal is not
  about trust, it is about a change no review can recover from.
`);
  return 0;
}

/** The standing table. Never sorted by anything — roster order, so this cannot read as a ranking. */
function standingTable(only) {
  const people = roster(ROOT);
  if (!people.length) {
    console.log(`
  No roster — nothing to report, and nothing is wrong.

  Almost every repository has one human and needs none of this. A roster appears when a second
  person does, and it lives at .harness/roster.json, which is gitignored and stays that way:
  it names real people, and a repository is not a place to publish a list of them.

  Run \`harness-standing --zoning\` to see the radius table, which is the part that ships.
`);
    return 0;
  }

  const ref = defaultRef(ROOT);
  if (!ref) {
    console.log("\n  Cannot measure standing — no git history to read. Not a pass and not a failure.\n");
    return 0;
  }

  const rows = people
    .filter((p) => !only || p.id === only)
    .map((p) => {
      const ev = evidenceFor(ROOT, p, ref);
      return { p, ev, elig: eligibility(ev) };
    });

  if (only && !rows.length) {
    console.error(`\n  No principal "${only}" in the roster. Known: ${people.map((p) => p.id).join(", ")}\n`);
    return 1;
  }

  // `reverted` appears ONLY in a single-principal view, and that asymmetry is deliberate.
  //
  // Anyone with repository access can run this command, so anyone can read the roster-wide table —
  // including the people in it. Side by side, `reverted` is the one negative column, and a row is a
  // person. In a one-person view the number is DIAGNOSTIC: it explains your own eligibility and you
  // can act on it. In a table it is COMPARATIVE, and there is nothing to act on in learning that
  // someone else has fewer. Same number, and the only difference is who else is on screen.
  const solo = Boolean(only);
  console.log(`\n  Standing — derived from ${ref}, recomputed now. Nothing here is stored.\n`);
  console.log(
    `    ${"principal".padEnd(16)}${"kind".padEnd(8)}${"tier".padEnd(13)}${"held".padEnd(7)}${solo ? "reverted".padEnd(10) : ""}eligible for`,
  );
  for (const { p, ev, elig } of rows) {
    const held = p.tier ?? "visitor";
    const under = elig.tier && !atLeast(held, elig.tier);
    console.log(
      `    ${p.id.padEnd(16)}${(p.kind ?? "human").padEnd(8)}${held.padEnd(13)}${String(ev.survived).padEnd(7)}${solo ? String(ev.reverted).padEnd(10) : ""}${elig.tier ?? "—"}${under ? " ←" : ""}`,
    );
  }

  const due = rows.filter(({ p, elig }) => elig.tier && !atLeast(p.tier ?? "visitor", elig.tier));
  if (due.length) {
    console.log("\n  Eligible for more room than they currently hold:\n");
    for (const { p, elig } of due) console.log(`    ${p.id} → ${elig.tier}  (${elig.why})`);
    console.log(`
  ELIGIBLE IS NOT PROMOTED. This tool will never edit the roster. Widening someone's write radius is
  a judgement about a person, and the evidence is a floor under that judgement rather than a
  substitute for it — the moment a number grants the power, the number becomes the work.
`);
  } else {
    console.log("");
  }

  console.log(`  Measures what has HELD: changes that landed and were not reverted, plus budget actually
  retired. Does NOT measure whether any of it was good work — git cannot tell a careful change from
  a trivial one, and scoring "impact" would be inventing a judgement and calling it arithmetic.
`);
  return 0;
}

const argv = process.argv.slice(2);
if (argv.includes("--zoning")) process.exit(printZoning());
else if (argv[0]?.startsWith("--")) {
  console.error("usage: harness-standing [<principal-id>] | --zoning");
  process.exit(2);
} else process.exit(standingTable(argv[0] ?? null));
