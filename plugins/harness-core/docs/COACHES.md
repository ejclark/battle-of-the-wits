# The coaching staff — detect-and-correct loops against slop

AI builds fast; unregulated speed compounds into slop. We run quality like a football staff — three
seats with distinct jobs:

- **Head coach (orchestrator).** Decides what runs when: WIP limits, dispatch, merge tempo, and the
  don't-collide-with-feature-work rule. The policy is codified as the **`/governor`** drill
  (`/harness-core:governor`): one dispatch cycle — WIP check → gate-named target → collision
  check → cheap-tier athlete → PR with auto-merge per the merge-policy table. Judgment calls (what may
  auto-merge, recruiting new athletes) remain Eric + Claude in-session; scheduling the cycle is earned
  by reps, not assumed.
- **Defensive coordinator.** Protects the standard: breaks down complexity and organizes the pieces.
  Owns the detect-and-correct units below (gates, ratchets, drills, athletes). Defense keeps entropy
  from scoring.
- **Offensive coordinator.** Scales up systems where a **constraint** binds (Theory of Constraints:
  *elevate*). Owns capability plays: the single-runner pipeline (GHA-minutes constraint), the local
  verify gate (review-trust constraint), Babylon MCP (domain-knowledge constraint), the local dev loop
  (iteration-speed constraint). Offense moves the ceiling; each play is triggered by a *measured*
  constraint, never speculation — same discipline as run-scale infra.

## The defensive unit — one quality dimension per loop

- **Eye (fitness function):** an executable eval that measures the dimension and enforces a committed,
  **ratchet-down-only budget** in CI. Prose audits drift; evals don't.
- **Drill (skill):** the repeatable corrective procedure, invokable as a slash command by a human or
  loaded by an agent. One safe, behavior-preserving move per PR.
- **Athlete (agent):** a scoped background worker that runs eye → drill → small green PR, off the
  critical path.

Slop accumulates precisely in the dimensions no defensive loop watches. Growing this roster *is* the
quality strategy (audit: `docs/ENGINEERING-AUDIT-2026-07.md`).

## The codification ladder — how work becomes delegable

Work descends this ladder as its contract gets written; each rung frees the head coach's attention:

1. **Manual** — done ad hoc in-session; judgment throughout.
2. **Skill** — the procedure is codified (a drill, e.g. `/decompose`, `/dedupe`); a human or Claude invokes it.
3. **Gated** — the trigger is mechanized (`--candidate` names the target); no one picks the work.
4. **Agent** — the full contract (trigger, procedure, verification, output) is written; a background athlete runs it end to end.

**The rule of three applies to agents:** do it manually once; codify the skill on the second recurrence; promote to an agent on the third. Speculative roster-building is premature abstraction — the roster recruits itself from demonstrated repetition. A subagent is what a piece of work becomes when its contract is complete. What cannot yet be contracted — taste, the yay/nay on a scene, which constraint matters next — stays with the head coach. **Model tier follows contract completeness:** rung-4 work runs on cheaper/faster models; judgment-incomplete work stays on the strongest model. Every toil-killer is the same loop (measure → judge → one bounded move → ratchet); defense's move is subtraction, offense's is substitution.

## The foreman — the seat between the coach and the athlete

The head coach dispatches and gets out of the way; an athlete runs one drill and stops. That works
for structural debt, where every unit of work is independent and the target is known before anything
starts. It does not work for **a sequence whose later steps depend on what the earlier ones found.**

That is the seat a **foreman** holds. The football name for it is the quarterback: the sideline calls
the play, the field runs it, and the field is allowed to change the call because information arrives
there first and does not have time to travel back up. The foreman owns a **drive** — an outcome
reached over several plays — rather than a play.

**The test that decides whether a foreman is justified**, and it is strict on purpose:

> **Does information arrive mid-sequence that the dispatcher could not have had?**
> If no — if the whole sequence is knowable up front — you want a **skill**, not a foreman. A
> pre-computable sequence is a script, and wrapping a script in an orchestrator buys nothing but a
> layer to debug through.

This forbids most foreman proposals, which is the point. The roster recruits itself from demonstrated
need; a tier invented ahead of one is the premature abstraction this ladder exists to prevent.

It is also the defence against the characteristic AI-era antipattern: **agents multiplied until the
org chart is reproduced in software.** Spawning a coordinator for every layer of a process feels like
architecture and is mostly Conway's Law escaping into the codebase — the *communication structure*
getting rebuilt as *runtime structure*, at full token cost, delivering the redundancy of the meeting
it was modelled on. An agent that only relays a decision made above it is a meeting with a bill. The
mid-sequence-information test is what an orchestrator must pay to exist, and most cannot.

**What a foreman may audible on, and what it must escalate.** It may reorder plays, skip one that
turned out to be unnecessary, repeat one, and choose which drill fits what it just learned. It may
not widen anyone's blast radius, raise a budget, touch the irreversible class, or continue past a
refusal. **A rail that refuses is the answer, not the obstacle** — the same rule that binds an
athlete, and it binds harder here, because a foreman is by construction the thing most able to
rationalise its way around one.

**Where the metaphor stops, and it stops somewhere expensive.** A quarterback has an *opponent*.
Nothing here does. `COACHES.md` already names this for the head coach — no season, no opponent, no
roster to cut — and it is sharper for the quarterback, whose whole craft is reading an adversary.
Reason from "read the defence" and you import competition, statistics, and benching into a system
whose entire purpose is cooperative throughput. Take the structure — *the sideline decides what, the
field decides how* — and leave the adversary in the source domain.

**Current roster:** the **onboarding foreman** (`/harness-core:onboard` is its playbook). It qualifies
under the test above about as cleanly as anything can: you cannot know at dispatch time whether
someone has an account, whether their 2FA will work, or where they will get stuck — and *where they
get stuck is the deliverable*, not an obstacle to the deliverable. The information that arrives
mid-drive is the product.

### Point a fan-out at verification, never at generation

Measured, on the run that produced the contributor model: three workflows, 26 agents, 2.85M tokens.
**The design half was rejected wholesale** — all three independent designs were discarded by their own
synthesis in favour of what had already been written inline, and the first-launched workflow reported
45 minutes in, opening with *"the architecture is already built and it is good."* **The adversarial
half paid for the entire run**, including a live PII hole that four shipped refusals could not have
caught.

The lesson is a straight application of the doctrine it violated: **AI made producing cheap and left
verifying exactly as expensive.** Generation was not the constraint — a session with the repository
in context designs faster than a fan-out can report — so spending capacity there was optimising a
non-constraint, and the fan-out's latency became pure added lead time.

So the rule: **a fan-out reviews a working draft; it does not produce one.** Write the thing, then
spend agents trying to break it. If a design genuinely needs several independent attempts — a wide
solution space, a decision that is expensive to reverse — say so out loud first, because that is the
exception rather than the default, and the default is what the tokens go to.

Deliberately not a gate. Nothing can mechanically tell a redundant fan-out from a needed one, and a
gate that guessed would refuse exactly the case worth running.

### Two seats that serve the staff rather than the code

Both sit outside the defensive roster, because neither watches a quality dimension. They watch the
*decisions*, which nothing else here did.

- **`theorist`** — tests a claim before it becomes a design decision. Every gate in this project checks
  the code; nothing checked the **assumptions the code was designed around**, and a wrong assumption
  survives review comfortably because it is never the thing under review. Its most valuable output is
  "no evidence either way", which is exactly the posture a gate takes toward a dimension it cannot
  measure. Recruited on the third recurrence, per the rule: two claims were tested by hand in one
  session — a throughput prediction and a team-topology claim — and a third was already forming.

- **`recruiter`** — the self-service path onto the roster, and the gate on it. An agent that creates
  agents drops the cost of creating agents to zero, and that cost was the only thing preventing
  proliferation. So its product is the **refusal**: it demands the three verified recurrences, applies
  the orchestrator test, checks the contract is complete, and otherwise writes the skill instead. If it
  approves everything it is worse than nothing — the same ad-hoc process with a rubber stamp and an
  implication of rigour that is not there. It may not recruit a successor to itself, which is the one
  proposal it can reject without checking anything.

### The captain is a different KIND of seat — and it already exists

A team captain looks like a third orchestrator and is not one. Coach and quarterback hold **delegated
authority**: it comes from above, and it can be handed to someone on their first day because the
contract is what makes it safe. A captain's authority is **conferred by standing among peers**. It
cannot be assigned, it does not come from the sideline, and appointing someone to it who has not
earned it produces exactly nothing.

Which means the captain is not a role to build here — **it is what the `steward` tier already is**,
seen from the social side instead of the permissions side. `harness-standing` computes the evidence;
the tier is the write radius; *captain* is the name for what that person does that no permission
describes:

- **Speaks for the contributor experience upward.** The most recently onboarded person knows what
  onboarding is actually like, and that knowledge decays within about a week as they acclimatise.
- **Is the reference implementation.** Their merged work is what "how we do it here" points at,
  which is a thing prose cannot accomplish and an example does for free.
- **Absorbs the socially expensive "no".** `CONTRIBUTORS.md`'s worst-case catalog names this as the
  one entry with no mechanism: rejecting a spouse's or close friend's change costs something a
  stranger's does not, and each avoided *no* makes the next harder. A peer saying *"that's not how we
  do it here"* costs a fraction of what the owner saying it costs. This is the captain's real job and
  the only one worth the word.

**Do not appoint one yet.** With two contributors, one of whom is the owner's spouse, a captaincy is
ceremony — and the third item above only works when there is a peer group for the authority to come
from. The honest trigger is roughly **four or more active contributors, at least one at steward by
evidence**. Until then the owner holds it, which is the accurate description of the current state
rather than a gap in the design.

## Experience is the north star — CX, UX and DX are one thing

**Customer experience, user experience and developer experience are the same discipline pointed at
different people.** A confusing error message and a confusing checkout flow fail in the same way, for
the same reason, and are fixed by the same move. The standard is not "usable". It is **lovable**:
the posture toward anyone meeting this system is *concierge* — full attention, carry the whole
request, never hand someone a form and call it help.

That has to be reconciled with a rule this project already holds, because they are in genuine
tension: *product and visual work always waits — that is taste, and taste is not a thing to be
inferred.* The resolution is a line between two kinds of surface:

- **Internal surfaces — act.** Gate output, refusal messages, CLI ergonomics, onboarding, the
  adoption sequence, documentation. These have a *correct* answer that evidence settles: did the
  reader know what to do next? Nobody's taste is being overridden, so waiting for a decision buys
  nothing and costs the reader.
- **Outward-facing identity — still waits.** Brand, palette, voice, product surface, anything a
  stranger judges the project by. That is taste, it is the owner's, and elevating experience to a
  north star does not transfer it.

The distinction is not "visual vs textual". It is **is there a fact that settles this?** Confusion is
a fact. Beauty is not.

**Fitness functions, because prose audits drift and evals do not.** Experience is measurable in at
least these ways, and the first two are already gates in this repository:

1. **No shipped instruction may name a command the reader does not have.** *(enforced —
   `tests/doctrine.test.mjs`)*
2. **No shipped link may point at a file an install does not contain.** *(enforced — same suite)*
3. **Every refusal must name the next action, not only the finding.** A gate that says what is wrong
   and stops has handed its reader a problem and kept the solution. This is why the preflight's
   refusal now lists what to do about it.
4. **Every dimension a tool cannot measure must be reported as unmeasured**, never as a pass. A false
   green is the worst experience a quality system can deliver, because it is indistinguishable from
   success right up until it isn't.

**Two registers, one posture.** The owner is an expert who wants terseness and will be slowed by
orientation he does not need. A new contributor needs the orientation and will be lost without it.
Same concierge, reading the room — and when unsure which is in front of you, the cost is asymmetric:
an unnecessary sentence costs a moment, a missing one costs the person.

## Resource cost is a fitness dimension

The constraint isn't only Eric's attention — it's every **finite resource** a run consumes: tokens,
GitHub API budget (esp. the scarce 5k/hr GraphQL bucket), GHA minutes, wall-clock. Treat waste in
these the way defense treats slop: measure it, and convert the recurring cost into a one-time one.

**Codify the loop into a script/codemod.** A model-in-the-loop procedure costs tokens (and often API
calls) *every* time; a script is a one-time build cost, then **~free per run forever** — and it can't
drift back to the expensive habit the way a prose instruction can. This is the self-healing flywheel:
each codified loop lowers the marginal cost of the next unit of work, so throughput compounds while
cost falls. Sound architecture + proper tooling + clean config make the next script cheaper to build,
compounding it further.

Worked example (the one that motivated this): landing a PR via the GitHub **MCP** spends **GraphQL**
by the thousands (one create+auto-merge+read cycle measured ~6,000 points; status-*polling* is worse),
while the same outcome over `git` + repo-scoped **REST** runs on your machine and the plentiful 15k/hr
**core** bucket. The fix was codified as `harness-ship` + the `/ship` skill: verify locally → push →
open over REST → one auto-merge call → **stop, trust the webhook, never poll**. Reach for the script;
grow the roster of scripts as recurring costs surface. When a finite resource starts binding, that's a
*measured* constraint the offensive coordinator elevates — never optimize a resource speculatively.

## Adopting a convention creates conformance debt — grandfather, then shrink

First separate the two kinds of convention, because they create very different debt:

- **Retroactive-judging** (a lint rule, a design token, a naming standard) — instantly makes the
  *existing* corpus non-conforming. Do **not** big-bang-rewrite history: **grandfather the existing
  violations, conform all NEW work, ratchet the budget down as files are touched** — exactly how the
  arch/clone/spec-gap gates already work. The debt is real but paid down incrementally, never in a
  churn-heavy sweep.
- **Forward-additive** (EARS — a *new artifact* you start producing: formal requirement statements) —
  creates ~**no back-catalog debt**, because there was nothing of that kind before to be non-conforming.
  You don't grandfather anything; you just start doing it on new work. Beware the category error of
  "conforming" things the convention doesn't even govern — EARS judges *requirements*, not the existing
  *specs* (verifications) or shipped plans, so those need no retrofit at all.

"Adopt EARS" was ~5 files precisely because it's forward-additive — not because 80 files were
grandfathered. Diagnose which kind you're adopting before you reach for a sweep.

**Corollary — know who the convention is for.** EARS is a *developer* convention: it lives in
dev-facing intake (the PR template, plans, the `/ears` drill). User-facing intake (the issue
templates, the `/feedback` form) stays **plain-language** for non-technical friends & family — triage
translates their report into EARS acceptance criteria (via `/ears`) *before* it becomes buildable work.
A convention that taxes the wrong audience is slop wearing a suit.

## Detection lag is the metric that finds the gaps in the system itself

Every coach above watches the *code*. One watches **us**: the learning Coach
(`harness-incident-scan` → `/retro` → `docs/LESSONS.md`). Its dimension is **detection lag** —
the time between the earliest moment a failure *could* have been noticed and the moment it actually
was. Lag of seconds (a spec goes red) means the nets are working. Lag of days means an entire class
of failure is currently invisible, and *that* is the finding — always bigger than the bug that
revealed it.

Two rules fall out, both paid for the hard way (see the ledger):

- **When you change a shared system, enumerate every actor that crosses it.** Branch protection has
  more consumers than pull requests (semantic-release pushes to `main`); npm's `prepare` has more
  callers than developers (the Dockerfile's `npm ci`, which runs *before* `COPY . .`). Both deploy
  outages were the same move: a correct change to a shared thing, with the consumer list never
  enumerated. The second name on that list is usually the bug.
- **Prefer shortening detection lag over preventing the specific bug.** Fixing one instance buys one
  instance; a signal that surfaces the whole class buys every future one. The outage that motivated
  this Coach was invisible for four merges *because nothing watched a red `main`* — the missing
  watcher was the real defect, and it is now the eye.

**Put the watcher on a path you already walk — never add a poller.** The tempting way to watch a red
`main` is a scheduled workflow: a cron that wakes up and *asks*. That spends GHA minutes and API
budget on a question, which is exactly the pattern `harness-ship` exists to delete — a monitor
built that way is the resource-cost smell wearing a safety vest. Instead, hang the check on traffic
that already flows. Every change here ships through `ship.sh open`, so the incident eye runs there:
one REST call on the core bucket, at the one moment the answer changes a decision (don't stack a
change on a broken `main`). Detection lag collapses to "the next time we ship" for zero recurring
cost. Generalize it: **a monitor that needs its own schedule is usually a monitor attached to the
wrong event.** Find the existing checkpoint first.

A failure is also the cheapest map of an unguarded region: while standing in it, log the adjacent
"what else is exposed this way?" threads to `docs/IDEAS.md` as side quests. That is the learning
flywheel — each incident buys both a prevention and a set of leads.

## Sourcing rule

**Adopt what's generic; craft what's bound to our gates.** Generic craftsmanship (code review, security
review, simplification) is solved — use the bundled skills. Anything that leans on our mechanics
(arch-budget, dupe-budget, Graphify, the design system) must be crafted here. Community skills are a
supply-chain decision: read them fully before adopting.

## Defensive roster

| Coach | Eye (eval + budget) | Drill (skill) | Athlete (agent) | Status |
|---|---|---|---|---|
| **Size/cohesion** (god files) | `harness-arch-scan` + `arch-budget.json` + `tests/arch/budget.spec.ts` | `/decompose` | `decomposer` | ✅ live |
| **Duplication** (pasted helpers) | `harness-dupe-scan` + `dupe-budget.json` + `tests/arch/dupe.spec.ts` | `/dedupe` | `ui-librarian` | ✅ live |
| **Clones** (pasted blocks, renamed identifiers) | `harness-clone-scan` (jscpd, adopted) + `.jscpd.json` + `clone-budget.json` + `tests/arch/clone.spec.ts` | `/dedupe` judgment | `ui-librarian` could extend later | ✅ live |
| **Dead code** (unused files/exports/types) | `harness-dead-scan` (knip, adopted) + `dead-budget.json` + `tests/arch/dead.spec.ts` | judge: un-export / delete / justify-ignore | `mortician` (recruited on recurrence #3, per the rule of three) | ✅ live |
| **Dep-graph** (cycles/orphans/layering) | dependency-cruiser + a budget + a gate spec — *not built; this row described a scanner no plugin ships, and said "live", until a prose gate caught it* | judge: break cycle / wire-or-delete orphan / restore layer direction | none yet (recruit on recurrence #3) | ⬜ queued |
| **Spec gap** (src files no spec imports) | `harness-spec-gap-scan` + `spec-gap-budget.json` + `tests/arch/spec-gap.spec.ts` (rstest has no line coverage yet — eye upgrades when it ships) | write BDD specs per ENGINEERING.md | `test-backfiller` | ✅ live |
| **Unlearned incidents** (detection lag) | `harness-incident-scan` + `incident-budget.json` + `tests/arch/lessons.spec.ts` (offline half: ledger integrity; remote half: failed `main` runs with no lesson) | `/retro` | none yet (recruit on recurrence #3) | ✅ live |
| **Inline-JS defects** (`<script>` syntax) | extract + `node --check` per page — *not built* | — | — | ⬜ queued |
| Code review | *(adopted)* | `/code-review` | — | ✅ bundled |
| Security review | *(adopted)* | `/security-review` | — | ✅ bundled |
| Simplification | *(adopted)* | `/simplify` | — | ✅ bundled |

## Special teams — situational units

Not every play is a down-in/down-out defensive loop. Special teams are situational crews with their own playbooks, run occasionally:

- **dep-warden** — reviews dependency-update PRs: reads changelogs, runs the suite, merges patch/minor on green, escalates majors. (First named unit; agent not yet built.)
- **Migrations** — one-shot tool/platform upgrades (e.g. Biome 2.x): run the migrator, triage fallout with judgment, land as one PR.
- **Incident response** — rollback drills, post-deploy failure handling (the pipeline's smoke → rollback is the mechanized first responder).
- **Release verification** — periodic prod screenshot/probe beyond the smoke test.

Dead-code, duplication, size — those stay regular defense: same eye/drill/ratchet shape every down.

## The scaling test — two axes, opposite defaults

Every decision gets asked *"does this scale?"* — but the answer depends on which axis, and the two run
**opposite** directions:

- **Build-scale (code · architecture · process): design as if thousands contribute.** Solo-with-agents
  effectively *is* a large team — many parallel hands, high commit velocity, no shared memory between
  sessions. So the eval question "would 10,000 engineers trip over this?" applies today: cohesion, no
  junk drawers, single-sourced helpers, machine-checkable conventions. Organized, high-quality code is
  what scales the *ability to build*.
- **Run-scale (infrastructure · platform): design for the real load — 5–10 people.** Here the enterprise
  reflex is the smell: microservices, k8s, caching tiers, queues for ten friends is slop wearing a suit.
  One Fly app + smoke + rollback is *correct* at this load. Infra earns complexity only when **measured**
  load demands it — never speculatively.

One line: **scale the ability to build, not the machinery to serve.** Confusing the axes is the classic
failure in both directions (spaghetti that can't grow ↔ a cluster for ten users).

## Smell catalog — what the eyes look for (and what stays judgment)

Every smell is either **mechanizable** (→ becomes/extends an eval) or **judgment** (→ lives in a drill's
checklist). Route new smells accordingly; a smell that stays prose in someone's head protects nothing.

| Smell | Kind | Where it's handled |
|---|---|---|
| God file (size × many exports) | mechanized | `arch-scan` |
| Exact duplication (same symbol, N files) | mechanized | `dupe-scan` |
| **Junk drawer** (`utils.ts`/`helpers.ts`/`common.ts`/`misc.ts` — cohesion by what it *isn't*) | mechanized | `arch-scan` (junk-drawer check) |
| Near-duplication ("something similar exists") | judgment | `/dedupe` drill — **rule of three:** abstract on the third occurrence, not the second; premature abstraction couples things that merely look alike |
| Sanity checks bleeding downstream (re-validating what a boundary should guarantee) | judgment | review checklist — fix the *boundary* (zod at the edges, audit C3), don't scatter guards |
| Design-system drift (pasted tokens/styles) | mechanized (coarse) | `dupe-scan` today; richer token-diff eval later |

## Atomic design — the decompose grammar

Decomposition needs a *target shape*, not just "smaller." We use atomic design:

- **Atoms** — one job, no siblings' knowledge: `escapeHtml`, `chip()`, a shader, a payoff function.
- **Molecules** — a few atoms with one purpose: a card, a nav, the Eye (shader + lids + gaze).
- **Organisms** — molecules composing a surface: a dashboard view, the tower scene, the login stage.

**Atoms are the default floor.** Go sub-atomic only when a concrete need calls (a second consumer wants
half the atom) — never speculatively. Over-splitting is the mirror-image slop: a thousand two-line files
with the complexity moved into the wiring.

## How the loop runs (and stays orderly)

- Every eye enforces in CI through the ordinary test job — a Coach's dimension cannot silently regress.
- Budgets **only ratchet down** (`--update` after a correction lands), so every win is permanent.
- `--candidate` makes each eye name its own highest-leverage target, machine-readable — no human picks.
- **WIP limit: one open structural PR per Coach.** The athlete doesn't start pass N+1 until pass N merges;
  the next target is recomputed from fresh `main`, which serializes work for free.
- Adding a Coach = one eval + one budget + one CI spec + one skill (+ optionally one agent). Use
  `skill-creator` and mirror an existing pair so the roster stays uniform.
