// PRINCIPALS — who may act on this repository, and how much room each one has.
//
// This exists because a repository that had exactly one human is getting more, and every rail here
// was built for the other kind of actor. An athlete is a process: its behaviour is fully specified by
// a contract, which is why `harness-preflight --agent` can decide whether a change is permissible
// BEFORE anything lands. Compliance is checkable in advance because the contract is the whole of the
// behaviour.
//
// A human is not specified by anything. You find out what someone does by watching what they did.
//
// That asymmetry is the whole model, and it produces a conclusion that sounds wrong until you sit
// with it: **a brand-new agent is trusted with more than a brand-new human, and that is correct.**
// Not because the agent is better — because the agent's radius is bounded by a gate that cannot be
// talked out of it, and the human's is bounded by judgement, which can.
//
// THREE RULES, and the first two are what keep this from becoming a scoreboard:
//
//   1. STANDING IS A VIEW, NOT A BALANCE. Nothing is accumulated, stored, or awarded. Every number
//      here is recomputed from the git log at read time. There is no counter to inflate, no state to
//      corrupt, and no way to be "owed" standing the history does not show. Stop contributing and it
//      reflects that, without anyone having to take anything away.
//
//   2. THE GATE SAYS "ELIGIBLE". ONLY A HUMAN SAYS "PROMOTED." Evidence is a FLOOR on advancement,
//      never a trigger for it. This is not ceremony: it is the only defence against the failure every
//      earned-influence system has — the moment the metric grants the power, the metric becomes the
//      work. Keep promotion a human act and the numbers stay diagnostic.
//
//   3. THE ROSTER IS LOCAL STATE AND IS NEVER COMMITTED. It lives under `.harness/`, gitignored, for
//      the same reason territory claims do — but with a sharper edge, because this file is about
//      PEOPLE. A roster naming real humans, in a repository that may be public and is distributed as
//      a plugin, is a disclosure no revert undoes. Same irreversibility as a leaked credential.
//
// WHAT THIS DELIBERATELY DOES NOT MEASURE: quality. Git can count what landed and what survived; it
// cannot tell a careful change from a trivial one, and a harness that scored "impact" would be
// inventing a judgement and presenting it as arithmetic. The claim is narrow and stated on every
// surface — this measures WHAT HAS HELD, a proxy for contribution and not a verdict on it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { descriptor } from "./descriptor.mjs";

/**
 * THE ZONING TABLE — the one piece of this file that is doctrine rather than measurement.
 *
 * Radius is expressed as predicates over the DESCRIPTOR, never over literal paths, because a table
 * that says `src/` grants nothing in a repository laid out as `lib/`. A zoning rule matching no files
 * does not fail loudly — it passes, permitting nothing and refusing nothing, which is the false green
 * this whole harness exists to prevent.
 *
 * Tiers are CUMULATIVE and ORDERED. Each is the previous plus a named increment, so no arrangement
 * exists in which a higher tier can do less than a lower one — a bug that is easy to write and nearly
 * invisible in a flat permission list.
 *
 * The increments are chosen by BLAST RADIUS, not by prestige:
 *   · visitor      — writes nothing. Contributes observations. Not a lesser membership: it is the
 *                    tier at which the one signal an author cannot generate about their own work
 *                    gets produced.
 *   · contributor  — prose and specs. Wrong prose is embarrassing; wrong prose is not an outage.
 *   · builder      — source. The gates catch it, and revert is one squash-merge away.
 *   · steward      — budgets and toolchain config. Now you change what the SYSTEM BELIEVES, which is
 *                    why it sits above changing what it does.
 *   · owner        — everything the preflight permits anyone. Which is still not everything.
 *
 * NOTHING HERE GRANTS THE IRREVERSIBLE CLASS. Workflow files, credential-shaped files and settings
 * are refused by `harness-preflight` to every principal including the owner, because that refusal is
 * a property of the CHANGE rather than of the person making it. Zoning composes with those refusals
 * by INTERSECTION, so adding a tier can only ever narrow what is permitted. A permission system in
 * which a new rule might widen access is one nobody can reason about.
 */
export function zoning(desc) {
  const d = desc ?? descriptor(process.cwd());
  const dir = (p) => (f) => f === p || f.startsWith(`${String(p).replace(/\/$/, "")}/`);
  const budgets = (f) => /(^|\/)[\w-]*budget\.json$/.test(f);
  const config = (f) => /^(harness|package|biome|knip|commitlint|tsconfig)[\w.-]*\.(json|js|mjs|ts)$/.test(f);

  const prose = [dir(d.docsDir), (f) => f === d.ideasFile, (f) => /^[A-Z0-9_.-]+\.md$/.test(f)];
  const specs = [dir(d.testDir)];
  const source = [dir(d.sourceDir)];

  return [
    { tier: "visitor", admits: [], grants: "nothing — contributes observations, which is the one thing nobody else in the system can produce" },
    { tier: "contributor", admits: [...prose, ...specs], grants: "documentation, the idea log, and specs" },
    { tier: "builder", admits: [...prose, ...specs, ...source], grants: "everything above, plus source" },
    { tier: "steward", admits: [...prose, ...specs, ...source, budgets, config], grants: "everything above, plus budgets and toolchain configuration — changing what the system BELIEVES" },
    { tier: "owner", admits: [() => true], grants: "everything the preflight permits anyone; the irreversible class is still refused, to everyone" },
  ];
}

export const TIERS = ["visitor", "contributor", "builder", "steward", "owner"];

/** Is `held` at or above `needed`? Tier order lives here so no caller invents its own. */
export const atLeast = (held, needed) => TIERS.includes(held) && TIERS.indexOf(held) >= TIERS.indexOf(needed);

/** The files a principal at this tier may not touch. An unknown tier admits nothing — fail closed. */
export function outsideRadius(tier, files, desc) {
  const zone = zoning(desc).find((z) => z.tier === tier);
  if (!zone) return files.map((f) => `${f} — unknown tier "${tier}", so no radius is defined and nothing is permitted`);
  return files.filter((f) => !zone.admits.some((admit) => admit(f))).map((f) => `${f} — outside the ${tier} radius (${zone.grants})`);
}

/**
 * The roster — local, gitignored, never committed, and absent by default.
 *
 * Absent is the NORMAL case, not an error: almost every repository has one human and needs none of
 * this. Returning an empty list rather than throwing is what lets callers treat "no roster" as
 * "nothing to enforce", the same posture a gate takes toward a dimension it cannot measure.
 *
 * A corrupt roster also reads as empty. A permission file that can brick the tool is a worse failure
 * than one that is missing, and the zoning table stays readable either way.
 */
export function roster(root) {
  const file = join(root, ".harness/roster.json");
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const list = Array.isArray(parsed) ? parsed : (parsed.principals ?? []);
    return list.filter((p) => p && typeof p.id === "string");
  } catch {
    return [];
  }
}

/**
 * Zoning violations for one named principal — the form `harness-preflight --as` consumes.
 *
 * FAILS CLOSED on an unknown principal, and the distinction matters. An unknown principal is not
 * "unrestricted", it is "no radius is defined", and those two readings differ by the entire value of
 * the check. The tempting alternative — pass when the roster is missing — turns `--as` into a flag
 * that reports success for a rule it never evaluated.
 */
export function zoningViolations(root, principalId, touched) {
  const principal = roster(root).find((p) => p.id === principalId);
  if (!principal) {
    return [
      `no principal "${principalId}" in .harness/roster.json — an unknown principal has no radius, ` +
        "so nothing is permitted. Add them to the local roster, or drop --as.",
    ];
  }
  return outsideRadius(principal.tier ?? "visitor", touched, descriptor(root));
}

/**
 * Read-only git that answers `null` instead of throwing. Named for its CONTRACT rather than for the
 * tool, because `preflight.mjs` has a `git` of its own that deliberately throws — `raisedBudgets`
 * relies on the throw to skip a budget file that did not exist on the base. Two helpers wrapping the
 * same binary with opposite failure behaviour are not one helper duplicated; sharing a generic name
 * would have been the coincidence, and the counter that flagged it was reading the name, not the job.
 */
const gitOrNull = (root, args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return null; // not a repository, no history, or no git — all of them "cannot measure"
  }
};

/** The ref standing is measured against. Never a local branch — only what actually shipped. */
export function defaultRef(root) {
  for (const ref of ["origin/HEAD", "origin/main", "origin/master", "main", "master", "HEAD"]) {
    if (gitOrNull(root, ["rev-parse", "--verify", "--quiet", ref])) return ref;
  }
  return null;
}

/**
 * What the history actually shows about one principal.
 *
 * Every input is countable from the local git log with no network call and no token — a deliberate
 * constraint rather than a convenience: a standing that needed an API would be unavailable exactly
 * when someone is offline and wondering whether they may touch a file.
 *
 *   landed     — commits of theirs reachable from the ref. What shipped.
 *   reverted   — those a later commit explicitly reverts. Git records this precisely, in the message
 *                `This reverts commit <sha>`, which is why it is the one negative signal worth
 *                counting: a FACT about the repository, not an opinion about the change.
 *   survived   — landed minus reverted. THE number, and the only one used for eligibility.
 *   ratcheted  — budget reductions across their commits. Unfarmable by construction: a budget only
 *                ever moves down, and how far is bounded by debt that actually exists. You cannot
 *                manufacture this the way you can manufacture a commit count.
 *
 * A principal with no `identities` measures as zero rather than as an error — they may simply not
 * have contributed yet, which is the state everyone starts in.
 */
export function evidenceFor(root, principal, base) {
  const ids = principal.identities ?? [];
  const ref = base ?? defaultRef(root);
  if (!ref || !ids.length) {
    return { landed: 0, reverted: 0, survived: 0, ratcheted: 0, measurable: Boolean(ref) };
  }

  const args = ["log", ref, "--no-merges", "--format=%H"];
  for (const id of ids) args.push(`--author=${id}`);
  const shas = (gitOrNull(root, args) ?? "").split("\n").filter(Boolean);

  const reverted = new Set();
  if (shas.length) {
    const body = gitOrNull(root, ["log", ref, "--format=%B", "--grep=This reverts commit"]) ?? "";
    for (const m of body.matchAll(/This reverts commit ([0-9a-f]{7,40})/g)) {
      for (const sha of shas) {
        if (sha.startsWith(m[1]) || m[1].startsWith(sha)) reverted.add(sha);
      }
    }
  }

  return {
    landed: shas.length,
    reverted: reverted.size,
    survived: shas.length - reverted.size,
    ratcheted: ratchetDelta(root, shas),
    measurable: true,
  };
}

/** How far a set of commits moved the committed budgets DOWN. Increases contribute zero, never less. */
export function ratchetDelta(root, shas) {
  let total = 0;
  for (const sha of shas) {
    const diff = gitOrNull(root, ["show", sha, "--unified=0", "--format=", "--", "*budget.json"]);
    if (!diff) continue;
    // Budgets are flat `"key": number` objects, so a reduction is a removed line and an added line
    // for the same key. Parsed per key rather than regexed across the hunk: a diff line that merely
    // MENTIONS a number is not a budget change, and counting it would reward reformatting.
    const before = new Map();
    const after = new Map();
    for (const line of diff.split("\n")) {
      const m = line.match(/^([+-])\s*"([^"]+)":\s*(\d+)/);
      if (!m) continue;
      (m[1] === "-" ? before : after).set(m[2], Number(m[3]));
    }
    for (const [k, was] of before) {
      const now = after.get(k);
      if (typeof now === "number" && now < was) total += was - now;
    }
  }
  return total;
}

/**
 * The highest tier this evidence would SUPPORT. Not a promotion — see rule 2 at the top of the file.
 *
 * The thresholds are deliberately low, and that is an argument rather than an oversight. A ladder
 * calibrated so advancement takes months teaches a new contributor that the system is something done
 * TO them; one where the first rung arrives after a handful of surviving changes teaches that it
 * responds. The rungs that actually matter — steward, owner — are not reachable by volume at all,
 * which is where the caution belongs.
 *
 * Note what is NOT here: no formula weighting several inputs into a score. A weighted index invites
 * exactly the optimisation it should discourage, and the weights would be invented — the one thing
 * the idea log's in-degree signal is careful to say it is not doing.
 */
export function eligibility(ev) {
  if (!ev.measurable) return { tier: null, why: "no history to read — this is not a verdict, it is silence" };
  if (ev.survived >= 12 && ev.ratcheted > 0) {
    return { tier: "steward", why: `${ev.survived} changes have held, and ${ev.ratcheted} lines of budget were retired` };
  }
  if (ev.survived >= 5) return { tier: "builder", why: `${ev.survived} changes have held` };
  if (ev.survived >= 1) return { tier: "contributor", why: `${ev.survived} change${ev.survived === 1 ? " has" : "s have"} held` };
  return { tier: "visitor", why: "nothing has landed yet — the starting position, not a judgement" };
}
