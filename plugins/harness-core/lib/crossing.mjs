// THE CROSSING — the dungeon a repository enters when it stops having exactly one human.
//
// Every other campaign is derived from committed budgets, which means every other campaign is about
// the CODE. This one is about the repository's people, and it exists because the hardest thing this
// project is currently doing is not a refactor — it is admitting contributors to a system whose rails
// were all built for processes.
//
// It rides the crossing metaphor deliberately, and the metaphor earns its place by making a
// distinction the campaign list could not otherwise express (see METAPHORS.md):
//
//   · A MOUNTAIN crossing is arduous and retreat is always available. You can see where you are, and
//     turning back is a decision available at any point. Small PRs, squash-merge and revert are
//     mountain discipline: spend your caution on keeping retreat open.
//   · An OCEAN crossing has a point of no return. Past it the only way out is through, provisioning
//     had to be complete before departure, and no amount of care mid-passage buys back what was not
//     loaded at the dock. Credentials, published packages, a profile written about a real person —
//     ocean discipline: all the caution is front-loaded, because there is no retreat to spend it on.
//
// The non-obvious prediction, which is why this is a skeleton and not scenery: **caution differs in
// KIND between the two, not in degree.** A process that answers risk by "being more careful" is
// applying mountain discipline to an ocean problem, and will feel diligent while changing nothing.
//
// DERIVED, NEVER INVENTED — the same rule the city and the map run on. The roster is real local state
// or there is no campaign at all. A repository with one human gets silence rather than an encouraging
// picture of a journey nobody is on.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The local roster, read here rather than imported from `harness-gates`.
 *
 * Deliberate duplication across the PLUGIN boundary — the exception `model.mjs` documents for the
 * capability descriptor, for the same reason: an adopter may install `harness-core` alone, and a
 * cross-plugin import would resolve only in a checkout of this repository. Note this is a READ of a
 * shape, not a copy of a decision: what a tier MEANS lives in `principals.mjs` and is not restated
 * here, because two files disagreeing about a person's standing is the failure this avoids.
 */
function localRoster(root) {
  const file = join(root, ".harness/roster.json");
  if (!existsSync(file)) return [];
  // Same refusal the standing report makes, for the same reason: `.harness/` reaches an adopter's
  // .gitignore only through harness-bootstrap, and installing the plugins does not run it. A
  // campaign that renders roster ids from a file git would happily commit is the harness helping to
  // publish it. No repository at all means no exposure path, so that case reads normally.
  try {
    execFileSync("git", ["check-ignore", "-q", "--", ".harness/roster.json"], { cwd: root, stdio: "ignore" });
  } catch (err) {
    if (err.status === 1) return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const list = Array.isArray(parsed) ? parsed : (parsed.principals ?? []);
    return list.filter((p) => p && typeof p.id === "string");
  } catch {
    return [];
  }
}

/** What the next step is for someone at this tier — the question a roster entry actually raises. */
const NEXT = {
  visitor: "observations only — nothing merged yet",
  contributor: "docs, specs and the idea log",
  builder: "source as well",
  steward: "budgets and config — changes what the system believes",
  owner: "everything the preflight permits anyone",
};

/**
 * The crossing as a campaign, or null when a repository has not started one.
 *
 * Null in two distinct cases, and both are honest silence rather than a pass: no roster at all
 * (the overwhelmingly common state), and a roster with one human on it (which is where every
 * repository starts and is not a journey).
 */
export function theCrossing(root) {
  const people = localRoster(root);
  const humans = people.filter((p) => (p.kind ?? "human") === "human");
  const agents = people.filter((p) => p.kind === "agent");
  if (humans.length < 2) return null;

  const landed = humans.filter((p) => (p.tier ?? "visitor") !== "visitor");
  const waiting = humans.length - landed.length;

  return {
    id: "the-crossing",
    name: "The Crossing",
    theme:
      `${humans.length} humans and ${agents.length} agent${agents.length === 1 ? "" : "s"} now share this repository, ` +
      "whose rails were built when there was one of the former and any number of the latter.",
    encounters: humans.map((p) => ({
      label: p.id,
      detail: `${p.id} — ${NEXT[p.tier ?? "visitor"] ?? "no radius defined for this tier"}`,
      stat: p.tier ?? "visitor",
    })),
    payoff:
      "The constraint stops being one person. Not on the first day — a rope team moves at the pace of " +
      "its slowest member, and roping in a second climber SLOWS the leader before it speeds the party. " +
      "What clearing this buys is the point past that: work that never routes through the owner at all." +
      (waiting ? ` ${waiting} of them ${waiting === 1 ? "has" : "have"} nothing merged yet — that is the next pitch.` : ""),
    party: "the onboarding foreman — one contributor per drive, and the first merge happens in the session",
    // Never outranks a measured finding, for the same reason the drawing board does not: this is
    // derived from a roster someone wrote by hand, not from a gate that measured something.
    weight: -1,
  };
}
