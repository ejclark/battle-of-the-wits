// Adoption sequencing — the order is not cosmetic, and getting it wrong is how adoption fails.
//
// Lifting a process into a repo has real dependencies between steps. Two of them are traps that
// silently break an adoption and get the whole harness blamed:
//
//   · Freeze the debt BEFORE the gates ever run in CI. A ratcheting gate with no committed budget
//     measures the repo's ENTIRE existing debt as new. The adopter's first PR goes red for code
//     they didn't touch, they conclude the gates are noise, and they turn them off. The grandfather
//     step is what makes the gates adoptable at all — it is not optional polish.
//
//   · Require the check AFTER it has passed once. Turning on branch protection for a check that has
//     never reported leaves every PR stuck on "waiting for status" forever, with no error to read.
//
// Everything else follows from tools needing to exist before they can run (husky's `prepare` builds
// the hook runner during `npm install`, so hooks written earlier exist but never fire).
//
// The phases group those steps by BLAST RADIUS, and each one earns the next: observe → freeze →
// ratchet → autonomy. That progression is the same bet as gold-tier dependency automerge — you do
// not hand a system autonomy first and hope; verification earns it.

/**
 * The ordered progression. Each step carries WHY it sits where it does — a sequence without its
 * rationale is a checklist, and the first person in a hurry reorders it.
 */
export function plan(state) {
  return [
    {
      phase: "1 · Install",
      title: "Write the process files",
      cmd: "harness-bootstrap",
      done: state.filesWritten,
      why: "Nothing runs yet. This only puts the config on disk.",
    },
    {
      phase: "1 · Install",
      title: "Install dependencies",
      cmd: "npm install",
      done: state.installed && state.hooksLive,
      why: "Must precede everything below — the tools have to exist before they can run. husky's `prepare` builds the hook runner here, so hooks written in the previous step are inert until this completes.",
    },
    {
      phase: "2 · Observe",
      title: "Look at the debt without enforcing anything",
      cmd: "harness-arch-scan && harness-dupe-scan && harness-spec-gap-scan",
      done: state.budgetsFrozen,
      why: "Read the numbers before committing to them. With no budget file the gates report and pass — this is the honest look at what you are inheriting.",
    },
    {
      phase: "3 · Freeze",
      title: "Grandfather today's debt as the budget",
      cmd: "for g in arch dupe dead spec-gap clone; do harness-$g-scan --update; done",
      done: state.budgetsFrozen && state.budgetsMissing.length === 0,
      critical: true,
      why: "THE ordering trap. Do this BEFORE the gates run in CI. Skip it and your first PR goes red for pre-existing debt you didn't cause — which is how gates get switched off and never switched back on. Freezing makes them block only *growth*.",
    },
    {
      phase: "3 · Freeze",
      title: "Confirm the full gate passes locally",
      cmd: "npm run verify",
      done: false,
      why: "CI is confirmation, not the first line of defense. A red gate here is cheaper than a red gate on a runner.",
    },
    {
      phase: "3 · Freeze",
      title: "Commit and open a PR",
      cmd: "git add -A && git commit -m 'chore: adopt the engineering harness' && git push",
      done: false,
      why: "commitlint is live now, so the message must be a Conventional Commit. Budgets belong in this commit — they are the repo's state, and reviewing them is how the team agrees on the starting line.",
    },
    {
      phase: "4 · Enforce",
      title: "Require `verify` on main — after it has passed once",
      cmd: "(repo settings → branches → require status check: verify)",
      done: false,
      needsAdmin: true,
      critical: true,
      why: "Second ordering trap. Requiring a check that has never reported leaves every PR stuck on 'waiting for status' with no error to read. Let it go green once, then require it.",
    },
    {
      phase: "5 · Autonomy",
      title: "Enable auto-merge, then let the athletes run",
      cmd: "(repo settings → allow auto-merge)  ·  then: /harness-core:governor",
      done: false,
      needsAdmin: true,
      why: "Last on purpose. Autonomy is earned by verification, never assumed — the same bet as automerging dependency updates only once the tests are real. With the gates proven, the background agents can burn debt down without supervision.",
    },
  ];
}

/** Render the progression, marking what is done and pointing at the single next action. */
export function render(steps) {
  const lines = ["", "  Adoption sequence — order matters, and two steps below say why:", ""];
  let phase = null;
  let next = null;

  for (const s of steps) {
    if (s.phase !== phase) {
      phase = s.phase;
      lines.push(`  ${phase}`);
    }
    const mark = s.done ? "✓" : next ? "·" : "→";
    if (!s.done && !next) next = s;
    const flags = [s.critical ? " ⚠" : "", s.needsAdmin ? " (needs repo admin — your call)" : ""].join("");
    lines.push(`    ${mark} ${s.title}${flags}`);
    if (!s.done) {
      lines.push(`        ${s.cmd}`);
      if (s.critical || s === next) lines.push(`        ${s.why}`);
    }
  }

  lines.push("");
  if (next) {
    lines.push(`  Next: ${next.title}`);
    lines.push(`        ${next.cmd}`);
  } else {
    lines.push("  Every step done — the harness is fully adopted.");
  }
  lines.push("");
  return lines.join("\n");
}

export { detect } from "./detect.mjs";
