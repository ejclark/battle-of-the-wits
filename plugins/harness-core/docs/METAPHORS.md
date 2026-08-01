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

## Using this

Before a metaphor is allowed to generate a mechanism, answer the five questions in writing. If it
fails most of them, it is a skin — ship it as flavour and do not let it decide anything. If it passes,
add it here **with its breaking point named**, because an entry without one is a story rather than a
tool, and a skeleton nobody has bounded is the one that will quietly capture a decision later.
