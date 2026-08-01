# Contributors — admitting a second human to a system built for one

Every rail in this harness was designed against one kind of actor: a **process**. An athlete's
behaviour is fully specified by a contract, which is why `harness-preflight` can decide whether a
change is permissible *before* anything lands. Compliance is checkable in advance because the
contract is the whole of the behaviour.

A human is not specified by anything. You find out what someone does by watching what they did.

That single asymmetry generates everything below, and it generates one conclusion that sounds wrong
until you sit with it:

> **A brand-new agent is trusted with more than a brand-new human, and that is correct.**

Not because the agent is better. Because the agent's radius is bounded by a gate that cannot be
talked out of it, and the human's is bounded by judgement, which can. The gate is the reason the
agent gets room on day one. The human's room is earned instead — not as a hazing ritual, but because
there is genuinely nothing else to bound it with yet.

---

## The two kinds of principal

| | **Agent** | **Human** |
|---|---|---|
| Behaviour is | *specified* — by a contract | *observed* — after the fact |
| Regulated as | configuration-as-code | evidence |
| Checkable | ex ante, before the change lands | ex post, from what shipped |
| Fails by | doing exactly what it was told, in a case nobody anticipated | irrationality, knowledge gaps, emotion, occasionally intent |
| Bounded by | `harness-preflight --agent` + territory claims | `harness-preflight --as` + zoning |
| Recovers by | fixing the contract | a conversation |

Both kinds share one radius table. What differs is how you come to occupy a place in it: an agent is
*assigned* a radius by its definition, a human *earns* one from history. One table, two doors.

The failure this table exists to prevent is treating the two as interchangeable in either direction.
Regulate a human like a bot and you get a person who feels audited by a machine and leaves. Regulate
a bot like a human — trusting a stated intention rather than a checked diff — and you get an
autonomous process operating on a promise.

---

## Standing is a view, not a balance

`harness-standing` reports what the git log says about each principal, recomputed on every read.
Nothing is stored, accumulated, or awarded. There is no counter to inflate and no way to be *owed*
standing the history does not show.

Three numbers, all countable locally with no network call and no token:

- **held** — commits that landed on the default branch and were not reverted.
- **reverted** — those a later commit explicitly reverts. Git records this precisely, in the message
  `This reverts commit <sha>`, which is why it is the one negative signal worth counting: it is a
  *fact about the repository*, not an opinion about a change.
- **ratcheted** — budget actually retired. Unfarmable by construction: a budget only ever moves down,
  and how far it can move is bounded by debt that genuinely exists. You cannot manufacture this the
  way you can manufacture a commit count.

**What this deliberately does not measure is quality.** Git can count what survived; it cannot tell a
careful change from a trivial one. A harness that scored "impact" would be inventing a judgement and
presenting it as arithmetic — the same trap the idea log's in-degree signal is careful to stay out
of, where a proxy is labelled a proxy rather than dressed up as a verdict.

### The gate says *eligible*. Only a human says *promoted*.

Evidence is a **floor** under advancement, never a trigger for it. `harness-standing` will name who
has outgrown their current radius; it will never edit the roster. Widening someone's write access is
a judgement about a person, and it stays with the owner.

This is not ceremony. It is the only defence against the failure mode every earned-influence system
has: **the moment the metric grants the power, the metric becomes the work.** Keep promotion a human
act and the numbers stay diagnostic. Automate it and you have built a machine that pays people to
farm it, then acted surprised.

---

## Zoning — the radius table

Run `harness-standing --zoning` for the live version; the radius is derived from `harness.json`, so a
repository laid out as `lib/` and `spec/` gets rules about `lib/` and `spec/`. A zoning table with
`src/` hardcoded in it grants nothing, refuses nothing, and passes — which is the false green this
whole harness exists to prevent.

| Tier | May write | Why the line is here |
|---|---|---|
| **visitor** | nothing | Contributes observations. See below — this is not a lesser membership. |
| **contributor** | docs, the idea log, specs | Wrong prose is embarrassing. Wrong prose is not an outage. |
| **builder** | + source | The gates catch it, and revert is one squash-merge away. |
| **steward** | + budgets, toolchain config | Now you change what the system *believes* — above changing what it does. |
| **owner** | everything the preflight permits anyone | Which is still not everything. |

Three properties worth stating, because permission systems go wrong in exactly these places:

1. **Tiers are cumulative and ordered.** Each is the previous plus a named increment, so no
   arrangement exists in which a higher tier can do less than a lower one — a bug that is easy to
   write and nearly invisible in a flat permission list.
2. **Zoning narrows; it never widens.** `--as` composes with the preflight's four standing refusals
   by intersection. Nothing passable on the command line unlocks anything. A preflight with a flag
   that granted access would be a preflight whose refusals are advisory.
3. **Nobody gets the irreversible class.** Workflow files, credential-shaped files and settings are
   refused to *every* principal, owner included. That refusal is not about trust — it is about a
   change no review can recover from, which is a property of the change and not of the person making
   it.

---

## What a non-expert contributor is actually for

The tempting framing is that a non-technical contributor is a junior engineer with a longer ramp.
That framing wastes them, and it is wrong.

Feedback from someone outside the system almost always arrives as a **prescription** wrapped around
an **observation**:

> *"You should make that message shorter."* ← prescription
> *"I read it three times and still didn't know what to do next."* ← observation

The prescription is usually worthless: it is uninformed about constraints the author has been living
inside for months. **The observation is irreplaceable, and the author structurally cannot generate
it** — they know too much to be confused by their own system. Expertise destroys the instrument that
measures confusion. That is not a figure of speech; it is why the person who wrote the error message
is the last person who can tell you it is unreadable.

So the intake protocol (`/harness-core:intake`) does one thing above all others: **separate the
observation from the prescription, bank the observation, discard the prescription, and credit the
contributor for the observation.** A visitor who writes nothing to the repository can be its single
most valuable sensor, which is why the visitor tier is described as contributing "the one thing
nobody else in the system can produce" rather than as the bottom rung.

It also happens to be the anti-devious mechanism, for free. A real observation is falsifiable and
reproducible — it has a *what I saw* and a *what I expected*, and it survives being asked "show me".
A pretext is a desired outcome with a rationale manufactured after the fact: unfalsifiable, and it
**shifts when challenged** rather than being defended. You do not need to read anyone's motives. You
need to ask what they saw, and notice whether the answer holds still.

---

## Worst case, and everything in between

City planning, in the sense of asking what happens when things go wrong *before* laying the roads.
Ordered by expected cost, which is not the same as ordered by drama — the top two are boring and are
what will actually happen.

### 1 · The confident wrong change · *most likely, not malicious*
A contributor is certain about something they are wrong about, and argues from feeling because they
have no evidence to argue from. The cost is not the change — the gates catch that — it is the
**argument**, which is paid in the one currency the system is short of.
**Control:** the intake protocol converts a position into an observation *before* it becomes a
debate. "What did you see?" is not a rhetorical move; it is the whole mechanism. Disagreements about
observations resolve by looking. Disagreements about prescriptions do not resolve at all.

### 2 · The demoralised contributor · *the real catastrophe*
A non-technical person joins a repository where autonomous agents open reviewed, verified pull
requests at machine speed, hits a red gate they do not understand, and quietly concludes they are not
wanted here. **This is the worst realistic outcome in the whole catalog** — every other entry costs
work, and this one costs the person. It is also the one no gate can detect.
**Control:** it has to be designed against rather than watched for. Every refusal in this harness
names what to do next, not just what is wrong. The onboarding drill targets a *merged* first
contribution fast, because the first merge is what makes the system feel real. And no artefact
anywhere describes a contributor as deficient — see the dignity rule below.

### 3 · Fixing the gate instead of the finding
A budget is in the way, so it gets raised. This converts every gate into decoration, silently.
**Control:** already mechanised. The preflight refuses a raised budget from anyone below steward, and
budgets are outside the contributor and builder radius entirely.

### 4 · The leaked secret
A non-technical contributor pastes a token into a pull request comment, a chat, or a screenshot. No
revert un-leaks it; rotation is the only remedy.
**Control:** the preflight refuses credential-shaped files, and the onboarding drill teaches the one
rule that matters — *tell someone immediately; rotation, not deletion* — before anything else,
because the instinct to quietly delete it is both universal and useless.

### 5 · Metric farming
Ten trivial pull requests to reach a threshold.
**Control:** structural rather than detective. Standing counts what *survived*, promotion is a human
act, and the one input that resists volume entirely — retired budget — is bounded by real debt.
**Honest limit:** git cannot tell trivial from substantial, so this is mitigated, not solved. If it
ever starts happening, the answer is a conversation, not a cleverer formula.

### 6 · The socially expensive "no"
Rejecting a spouse's or a close friend's change costs something a stranger's does not, and the cost
compounds: each avoided *no* makes the next one harder.
**Control:** this is the one entry with no mechanism, and pretending otherwise would be worse than
naming it. What helps is that the gates say no impersonally and first, so most rejections are never a
person rejecting a person. What remains is genuinely the owner's problem, and it is better to know
that in advance than to discover it during an argument.

### 7 · Human/agent collision
A contributor edits files an athlete is mid-refactor on. Their work is clobbered or the athlete's is.
**Control:** the claims registry already models territory; `harness-claim --list` says who holds
what. **Gap worth naming:** athletes claim, humans do not, so today this is an asymmetric rail. The
cheap mitigation is that athletes work on structural debt and new contributors work on docs and
specs, so the territories rarely overlap. That is a coincidence of the current roster, not a
guarantee, and it should be revisited the moment a human is working in `sourceDir`.

### 8 · Governance capture
Many small, individually reasonable changes accumulate into a direction nobody chose.
**Control:** honestly, scale. This is a real failure mode of large open contribution and a fantasy
concern for a three-person repository. Named here so the catalog is not accused of only listing
problems it had already solved — and so that if the system ever grows to where it applies, the entry
is already sitting here waiting.

### 9 · The profile leak
Any characterisation of a real, named person — their skills, their gaps, their working style — is
personal information about someone who did not publish it. Committed to a repository, it is
world-readable, permanent in history, mirrored into every fork, and, in a repository distributed as a
plugin marketplace, copied into strangers' caches. **A revert does not undo it.** It is the exact
same irreversibility as a leaked credential, with the difference that the person harmed is a friend.
**Control, and it is absolute:** the roster lives at `.harness/roster.json`, which is gitignored. The
harness ships the *procedure*; the repository being worked on keeps its own list of who is on it.

---

## The dignity rule

**A shipped procedure is written for a capability level. It is never written about a person.**

"Written for someone new to git" is a design constraint. "Written for Tony, who struggles with git"
is a personal characterisation, and it does not belong in a file, a commit message, a pull request
comment, an issue, or an agent's prompt. Not because it is unkind — though it is — but because a
capability assessment attached to a name is *personal data*, and this system's own doctrine already
says what to do with data whose disclosure cannot be undone: it does not go in the repository.

The operational test is short: **if the person it describes read it, would it be a normal thing for
them to see?** Anything that fails that test is local state at most, and usually should not be
written down at all.

---

## What this costs before it pays

The premise worth stating plainly, because the design should not quietly assume it away: a second
human does **not** double the throughput of the constraint on day one. For a while it lowers it.

Theory of Constraints is unsentimental here. If the binding constraint is the owner's *judgement* —
review attention, taste, the yes/no — then a contributor who cannot yet exercise that judgement does
not relieve that constraint. Their work *arrives at* it. Every pull request they open is load on the
exact resource that was already scarce, plus the orientation cost of getting them there.

So the honest sequence is: **cost, then break-even, then gain** — and the whole design above is aimed
at making the first phase short rather than pretending it does not exist.

### Two corrections, because the paragraph above is the standard answer and the standard answer is now partly wrong

**Brooks's Law is re-partitioned, not repealed.** Onboarding cost is not one thing. It is at least
four, and they have stopped moving together:

| Component | Delegable to an agent? | What happened to it |
|---|---|---|
| **Orientation** — what is this, where is what, how do I do X | **fully** | collapsed toward zero; used to be the largest share, and used to be the leader's |
| **First-pass verification** — is this change correct | **mostly** | this is what the gates are; the fixed-line fraction |
| **Judgement** — is this the right thing at all | **no** | unchanged |
| **The relationship** — is this person motivated, does a "no" land well | **no** | unchanged, and arguably *increased* by having a contributor |

The classical prediction assumed the whole cost lands on the constrained human. It no longer does.
The **slope** of the cost curve dropped sharply; the **floor** did not move at all — and the floor is
now what dominates. The useful consequence is that onboarding cost is no longer paid mostly in
*teaching*, which compresses, but in *deciding*, which does not. Optimising the teaching further is
optimising a non-constraint.

**Resilience is a second axis, and Theory of Constraints does not price it.** ToC optimises flow
through a system it *assumes will keep existing*. It has nothing to say about variance, bus factor,
or the probability the project survives its owner losing interest, getting ill, or being busy for a
quarter. A repository where one person holds every reason why anything is the way it is is fragile at
any throughput.

So a second human can be **throughput-negative and survival-positive at the same time**, and both are
true simultaneously rather than one being the consolation for the other. The mistake is scoring the
decision on the throughput axis alone, because that is the axis with a theory attached — which is
exactly the streetlight effect. If the second axis were priced honestly, the cost phase would not
need to be defended at all; it would be the premium on an insurance policy nobody argues about.

Three things shorten it, and they are why the pieces are shaped the way they are:

- **Work that does not route through the constraint.** The observation intake is the clearest case: a
  banked observation costs the owner nothing at capture time and competes on merit later. A visitor
  producing observations is net-positive on day one, before any code is written.
- **Gates that answer the questions the owner would otherwise answer.** Every refusal that names its
  own fix is a question that never reaches him. This is the codification ladder applied to a person
  instead of a task, and it is the highest-leverage work in the whole model.
- **A fast first merge.** Not motivational theatre — it is the cheapest way to find out whether the
  rails actually hold for someone who did not build them.

**A falsifiable criterion, so this is checkable rather than believed:** if, after roughly ten of a
contributor's changes have landed, the owner's time per merged change of theirs is not clearly
falling, the model is not working. The likely cause is that the work being routed to them was chosen
to *feel* helpful rather than to subtract load — and the fix is to change what they are given, not to
add process.

---

## How this scales — team topology, and where the phase changes are

The claim under test: **teams of 2–3 are great, and clusters of 2–3 teams is where you hit critical
mass.** It survives, and the reason it survives is more useful than the numbers.

Communication channels grow as `n(n−1)/2`. Clustering changes the exponent's base rather than the
exponent, because each team presents *one* interface instead of every member presenting their own:

| Shape | People | Channels | Flat equivalent |
|---|---|---|---|
| 1 team of 3 | 3 | 3 | 3 |
| 2 teams of 3 | 6 | 7 | 15 |
| **3 teams of 3** | **9** | **12** | **36** |
| 4 teams of 3 | 12 | 18 | 66 |

The interesting column is neither of those. It is **inter-team** channels, and it is where the phase
change actually lives:

| Teams | Inter-team channels | |
|---|---|---|
| 2 | 1 | one person holds it |
| **3** | **3** | one person still holds it |
| 4 | 6 | **needs a dedicated coordinator** |

So the theory is right, and the two numbers are the *same* threshold applied twice: **a unit stops
working when its internal channel count exceeds what one person can hold, which is about three.** A
team of 3 has 3 internal channels and everyone can carry everyone's context; a team of 4 has 6 and
needs a designated decider. A cluster of 3 teams has 3 interfaces and one person can hold them; a
cluster of 4 has 6 and now someone's whole job is coordination.

**Critical mass at 2–3 teams of 2–3 is precisely the largest organisation that needs no manager.**
That is the mechanism, and it is why the number recurs at both levels rather than being two separate
observations. Note also that 9 people is 12 channels — *more* than any one person can hold. The
cluster works because **nobody holds all of it**: each person holds their team plus their team's
interfaces. Anyone who insists on holding the whole graph re-creates the flat cost and becomes the
constraint personally.

### The correction this repository exists to test

All of the above prices **human-to-human** channels, and it comes from an era in which coordination
*was* conversation. Much of the coordination here is mediated by artifacts instead, and an artifact
channel is `n×1`, not `n²` — each person coordinates with the system rather than with every other
person:

| Coordination question | Conversational form | Artifact form here |
|---|---|---|
| "are you touching this file?" | ask everyone | `harness-claim --list` |
| "is this change acceptable?" | a review thread | the gates |
| "what should I work on?" | a meeting | `harness-dungeon --today` |
| "what am I allowed to touch?" | ask the owner | `harness-standing` |
| "what did we decide and why?" | tribal memory | ADRs, `LESSONS.md`, `METAPHORS.md` |

So the honest prediction is not that 2–3 × 2–3 is wrong. It is that **the ceiling is set by
coordination cost, and this harness is a machine for moving coordination off the `n²` channels.** Two
consequences follow, and the second is the one worth watching:

1. The same cluster should carry more work than the classical numbers suggest — not more *people*
   necessarily, but more throughput per person before the structure strains.
2. **The "4 teams needs a coordinator" wall is liftable, because the coordinator need not be human.**
   That is exactly what the foreman tier is. This is the one place where the AI version of the theory
   diverges from the classical one rather than merely stretching it — and it comes with the warning
   already in `COACHES.md`: a coordinator that only relays a decision made above it is a meeting with
   a bill, and multiplying those reproduces the org chart in software at full token cost.

**What would actually test this, rather than argue it:** the principal × district matrix — who touches
what. If team boundaries and code boundaries coincide, the clustering is real and Conway is working
for you. If everyone touches everything, you have one team wearing three names and are paying flat
`n²` while believing you are not. That measurement is banked as idea #1 and is the single highest-value
instrument this repository does not yet have.

**Stated honestly: none of this is evidence yet.** This repository has one human. The mechanism is
sound and checkable; the claim that it holds *here* has an n of 1, and saying otherwise would be the
flattery every gate in this system exists to prevent.

## What not to build

This is governance for a household. The doctrine that applies is the repo's own: *every config option
is a decision the system failed to make*, and the roster recruits itself from demonstrated repetition
rather than from anticipated need.

So there is deliberately **no** voting mechanism, no weighted influence score, no appeals process, no
contributor-agreement document, and no dashboard. Those solve coordination problems that appear at a
scale this is nowhere near, and each one would be a control surface standing in for a decision that a
five-minute conversation makes better.

What exists is the smallest set that is load-bearing today: a radius that is enforced rather than
described, standing that is derived rather than awarded, an intake that preserves the signal a
non-expert uniquely produces, and a written record of what happens when it goes wrong. If something
here is never used within a few months, it was ceremony and should be deleted — and that judgement is
easier to make honestly if it was written down as a possibility from the start.
