# Load-bearing metaphors — the catalog, and the rubric for why they hold

Almost every mechanism in this harness is a **borrowed structure**. The coaching staff, the ratchet,
the dungeon, Theory of Constraints, commander's intent, nets and eyes and funnels — none of these
were invented here. That is not a shortcut, it is the method, and this document is the method written
down so it can be applied deliberately instead of stumbled into.

The distinction that makes it usable:

- **Skin** — aesthetic. The Eye of Sauron, tractor beams, a telestrator. Flavour on accurate
  mechanics; buys memorability and engagement. A skin can be swapped without touching behaviour, and
  that is the test of whether something is one.
- **Skeleton** — structural, and **generative**. It produces mechanics rather than looks, and it
  answers questions its author never anticipated. Swapping it changes what the system does.

Getting these confused is expensive in one direction only. A bad skin is a bad joke. **A bad skeleton
still produces plausible architecture**, which is why it survives review.

## The rubric — what predicts that a metaphor carries weight

Five questions. A metaphor that fails 4 or 5 is a skin; treat it as decoration and enjoy it. One that
passes them is a skeleton, and is allowed to generate mechanics.

1. **Surplus structure.** The source domain has more detail than you have spent, so it keeps
   answering. DNA offers replication, expression, mutation, recombination, junk regions. *"The
   codebase is a garden"* answers once and stops.
2. **The source solved a real constraint under pressure.** Importing a battle-tested structure
   imports its proof. This is why borrowed beats invented — someone already paid for the debugging.
3. **Isomorphism of relations, not nouns.** The mapping must preserve how the parts *interact*. The
   failure mode is vocabulary transferring while structure does not: you get the words "coach" and
   "athlete" and none of the division of labour that made them mean anything.
4. **It makes falsifiable, non-obvious predictions.** Theory of Constraints predicts *optimising a
   non-constraint is waste* — checkable, and counterintuitive enough to change a decision. A
   decorative metaphor predicts nothing, which is why it never turns out to be wrong.
5. **Its breaking point is nameable.** Knowing where the analogy stops is what keeps it honest, and
   an entry below without a stated breaking point is not finished.

### Metaphor capture — the anti-pattern this rubric exists to catch

Driving decisions past the isomorphic region, because the metaphor is still producing fluent answers.
The tell is that the argument stops referring to the system and starts referring to the analogy: *"a
coach wouldn't do that"* is not an engineering reason. Rule 5 is the defence — a skeleton whose
breaking point nobody has named cannot be over-driven, because nobody knows where the edge is.

## The catalog — what this harness actually runs on

Each entry names the borrowed structure, what it generated here, and **where it stops**.

### The ratchet
**From:** mechanical ratchets, and the "ratchet effect" in economics and policy.
**Generated:** budgets that freeze today's debt and only ever lower; `--update` refusing to raise;
grandfathering so adoption never requires a flag-day cleanup; "fix the finding, never the gate."
**Predicts:** that improvement is permanent without anyone maintaining discipline — which is the
non-obvious part, and it has held.
**Breaks when:** a change legitimately grows a file, which happens whenever a module *receives* a
well-placed extraction. The ratchet cannot tell "absorbed a good refactor" from "someone piled on",
so raises exist, must be recorded with reasoning, and are a human's call. Four have been recorded.

### The coaching staff
**From:** American football — defensive coaches, offensive coaches, a head coach, athletes, drills.
**Generated:** gates as *eyes* that watch one dimension; skills as *drills* that correct what an eye
finds; agents as *athletes* who run drills; the governor as a *head coach* who dispatches; detection
and correction as separate jobs held by different roles.
**Predicts:** that an eye without a drill is a complaint, and a drill without an athlete is a manual.
Both turned out to be true and both were fixed because the metaphor named the gap.
**Breaks when:** the analogy suggests the head coach should *judge performance*. There is no season,
no opponent, and no roster to cut — the governor dispatches and gets out of the way. Pushing past
this produces surveillance, not throughput.

### Theory of Constraints
**From:** Goldratt, manufacturing.
**Generated:** the entire operating posture — Eric's attention is the constraint, so identify /
exploit / subordinate / elevate; absorb noise rather than escalate it; a gate that costs attention
must buy more than it spends.
**Predicts:** that optimising anything but the constraint is waste. Directly responsible for the
interrupt-economics rule and for auto-merge being opt-*out*.
**Breaks when:** the constraint moves. It has, at least once — while the athletes were unproven, the
binding constraint was not attention but *trust in the rails*, and work aimed at attention would have
been the waste. A model of the constraint that nobody re-derives is just a slogan.

### Commander's intent
**From:** Jocko Willink; decentralised command in military doctrine.
**Generated:** doctrine files that state end-state rather than procedure; the expectation that an
executor adapts instead of asking; the irreversible class as the explicit carve-out.
**Predicts:** that stating *why* survives situations that stating *what* does not — the reason these
docs argue rather than instruct.
**Breaks when:** intent is genuinely ambiguous and the cost of guessing wrong is high. Then the
doctrine's own answer is to ask, which means the metaphor contains its own off-switch. That is rare
and worth noticing.

### The dungeon crawl
**From:** tabletop RPGs and roguelikes.
**Generated:** ADRs as cleared rooms; budgets as bosses; unmeasured dimensions as fog; campaigns that
each state what clearing them buys; the visual ladder's first rung.
**Predicts:** that a numbered list of decisions is a navigation failure — which is a real, known
weakness of ADR practice that the map now attacks.
**Breaks when:** it implies progression is linear or that dungeons get harder. Debt is not levelled,
and the hardest dungeon is often the first. Also: nothing here should ever be *fun to lose*.

### Nets, eyes, funnels
**From:** fishing, surveillance, and sales pipelines respectively — three different sources, which is
itself the point.
**Generated:** overlapping detection with deliberate redundancy; each gate watching exactly one
dimension; findings narrowing from signal to named target to dispatched fix.
**Predicts:** that overlapping nets catch what any single one misses, and that a hole is invisible
from inside the net. Both confirmed repeatedly — most sharply when a parity gate passed by parsing
nothing.
**Breaks when:** "more nets" is treated as strictly better. Each one costs attention when it fires
wrongly, and a net nobody trusts gets disabled, taking its real catches with it.

### Genotype → phenotype
**From:** molecular biology.
**Generated:** the framing that `CLAUDE.md` is a *genome* — a compact specification that **expresses**
into a large artifact, conditioned on its environment. The same doctrine expresses differently in a
different repository, which is exactly what portability means and why the descriptor exists.
**Predicts:** configuration drift is *mutation*; dead code and unread docs are *junk regions*;
merge-back is *recombination*. Each of those has a mechanism here.
**Breaks when:** you look for selection pressure. Nothing here reproduces differentially, so the
evolutionary half of the source domain is unspent surplus rather than an available mapping — the
richest unexploited vein in this catalog, and the one most likely to be over-driven.
**The warning it carries:** Jurassic Park reconstructed from a *partial* genome, and **the gap-filler
determined the organism**. Porting a system with gaps means the destination silently fills them, and
you get something that runs but is not the thing you meant. That is the sharpest argument for the
capability descriptor, and it is why every default in it is documented rather than inferred.

### The rope team
**From:** alpinism — the roped party, belays, and protection placed on lead.
**Generated:** the whole shape of admitting a human to a system built for processes. The leader
places protection *for the people following*, which is what a gate is; a fall is arrested by the
protection rather than by anyone's reflexes, which is why zoning is enforced and not advised; and
*never climb above your last piece of protection* becomes **never hand someone work whose mistakes
the gates cannot catch** — the single rule that decides what a new contributor is given first.
**Predicts:** that roping in a second person *slows the leader before it speeds the party*, because
half the party is belaying at any moment and the belayer's attention is spent, not banked. That is
counterintuitive against the reason people add contributors, it contradicts the premise this work
started from, and it is the prediction most worth checking. Two further distinctions fall straight
out of it and are the reason this entry earns its length:
**Fixed line vs. pitched belay** — work whose verification routes through the constraint's live
attention costs it 1:1, while work on ground a lead already ran, with the gates green behind it, costs
it nothing. So the goal of onboarding is *raise the fixed-line fraction*, not *add a person*, which
turns the throughput premise from a hope into something measurable.
**Objective vs. subjective hazard** — subjective hazard (a mistake) is mitigated by skill; objective
hazard (rockfall, a serac) is indifferent to skill and is mitigated only by not being there. That is
why competence must never unlock the irreversible class: conflating the two is how a good climber
dies under a serac.
**Breaks when:** it suggests the follower's risk is always arrestable. A rope catches a fall; nothing
catches a published credential or a leaked confidence. The irreversible class has no belay, which is
exactly why it is refused to every principal rather than granted to trusted ones — and it is the
place where reasoning from the metaphor produces a confident, wrong answer.
**And breaks a second way, which is newer and much easier to miss: it assumes the belayer is a
climber.** The "roping in a second person slows the leader" prediction is made entirely of the
leader's own attention holding the rope. When a capable agent absorbs the orientation, the
explaining, and the first-pass review, the belay is held by something that **is not the constraint**,
and the cost the prediction is built from never lands on the party's speed at all. Reasoning past
this point yields the confident, wrong conclusion that a new contributor must always be a net drag.
The source domain already contains the correction, and this entry under-applied its own import: on
siege-style expeditions the fixed lines are placed by a *different* team, and the climber ascends a
rope they neither placed nor hold. The accurate reading is that AI moved a large share of onboarding
from *pitched* to *fixed line* — so Brooks's Law is **re-partitioned rather than repealed**, and what
did not move (judgement, and the relationship) is what now dominates.

### The crossing — a mountain range and an ocean
**From:** two expedition traditions that are peers in difficulty and opposites in structure.
**Generated:** a way to sort monumental work that the reversible/irreversible distinction alone does
not give you. **A mountain crossing is arduous but retreat is always available** — you can see where
you are, and turning back is a decision you may make at any point. **An ocean crossing has a point of
no return**; past it the only way out is through, provisioning had to be complete before departure,
and navigation is dead reckoning without landmarks. Small green PRs, squash-merge and revert are
mountain discipline: optimise for retreat. Credentials, published packages, sent mail and anything
outward-facing are ocean discipline: optimise for provisioning, because there is no retreat to
optimise.
**Predicts:** something non-obvious and checkable — that **caution differs in kind, not degree,
between the two.** More care on a mountain buys better retreat options. More care mid-ocean buys
almost nothing; all of it had to be spent before leaving harbour. So a process that responds to risk
by "being more careful" is applying mountain discipline to an ocean problem, and will feel diligent
while changing nothing. That is a real, recognisable failure and this framing names it.
**Breaks when:** it implies every significant undertaking is one or the other. Most work is a day
hike, and dressing an afternoon's refactor as an expedition is how a team acquires ceremony. It also
breaks at the destination: expeditions have a far shore and a summit, and software has neither — so
*arrival* is the part of both source domains with nothing to map onto, and the surplus structure
there should be left unspent rather than forced.

## Using this

Before a metaphor is allowed to generate a mechanism, answer the five questions in writing. If it
fails most of them, it is a skin — ship it as flavour and do not let it decide anything. If it passes,
add it here **with its breaking point named**, because an entry without one is a story rather than a
tool, and a skeleton nobody has bounded is the one that will quietly capture a decision later.
