# Borrowed theory, and where it actually stands

Known patterns are the cheapest available head start. Somebody already ran the experiment, somebody
already paid for the mistake, and starting from their answer beats starting from nothing almost every
time.

**But borrowed theory arrives as an assumption wearing the clothes of a fact**, and this project has
a rule about that: every gate here checks the code, and nothing checked the beliefs the code was
designed around. A wrong assumption survives review comfortably, because it is never the thing under
review.

So theory is admitted here as a **hypothesis with a test attached**, never as a citation.

## The one admission rule

> **No entry without a falsifier.** If you cannot say what observation would make the claim wrong
> *here*, it is not a theory, it is a quote — and a wall of quotes accelerates nothing.

This is the same rule the metaphor catalog runs on, for the same reason: the breaking point is what
makes it load-bearing. `tests/theories.test.mjs` enforces it, so an entry that skips the falsifier
fails the suite rather than quietly joining the furniture.

## Why "shifted" is the interesting column

The naive expectation is that old theory either holds or breaks. In practice the useful finding is
almost always neither: **the claim survives and its mechanism moves.** Brooks's law still describes
something real, but the coordination cost it is really about does not scale the same way when most of
the added capacity is not human. The recommendation that falls out is different even though the
observation is intact.

That is where the leverage is. A theory that plainly broke is easy and rare. A theory quietly running
on a mechanism that no longer applies is invisible, load-bearing, and everywhere.

| Status | Means |
|---|---|
| `untested` | Imported. Nothing here has checked it. Honest default. |
| `holds` | Tested against this repository's own evidence and survived. |
| `shifted` | The observation still holds; the **mechanism or magnitude** moved, so the advice changed. |
| `inverted` | The recommendation is now wrong in this context. |
| `unstated` | Cannot be tested as phrased. Needs restating before it is worth anything. |

Run `/theorist` on any entry to move it. Moving one is a normal contribution.

---

## The register

### Software engineering

**Brooks's law — adding people to a late project makes it later.** · `shifted`
*Falsifier:* a period where capacity was added and throughput rose without a matching rise in
coordination cost.
The mechanism is communication overhead growing as n². The observation stands, but the overhead is
paid per *communicating pair*, and delegating to an agent does not create the same pair — briefing
costs something, being briefed costs the human nothing further, and the agent does not need to be
kept in sync with the other agents. The claim was never really about headcount; it was about
coordination, and that is what changed.
*Evidence:* this project is built almost entirely by delegation and has not paid the predicted cost.
*Not yet ruled out:* the cost may simply have moved to review, which would make it the same law with
a new bottleneck rather than a weakened one. That is the test worth running next.

**Small batches ship faster and safer.** · `shifted`
*Falsifier:* a large change that merged cleanly and quickly, or a small one that cost more than a
large one because it sat.
Right about the failure, wrong about the cause. A two-week pull request is not expensive because it
is large — it is expensive because `main` moved underneath it. The cost is **divergence over time**,
and the two come apart: 900 lines merged within the hour carries almost no risk, 40 lines open nine
days carries plenty. So the thing to minimise is age against the rate the base is moving, not diff
size. *See idea 39.*

**Broken windows — visible disorder invites more disorder.** · `untested`
*Falsifier:* debt growing at the same rate in a district with a frozen budget as in one without.
The entire ratchet is a bet on this claim, which makes it the most load-bearing untested belief in
the repository. The budgets and their history are committed, so the test is available and nobody has
run it.

**Conway's law — systems mirror their organisation's communication structure.** · `untested`
*Falsifier:* module seams falling somewhere other than the seams between the people who write them.
Usually asserted, rarely shown. This repo derives a structural model *and* a principal model, so it
holds the raw material for actual evidence rather than assertion. *See idea 1.*

**The Three Ways — flow, feedback, continual learning.** · `shifted`
*Falsifier:* a period where producing was the bottleneck rather than verifying.
Flow assumed producing was expensive and verifying cheap. AI inverted the ratio, so optimising flow
now means optimising *verification*, and the second way — feedback — carries the weight the first one
used to.
*Evidence:* this repository's own shape. Nine of its modules are scanners and six are gates; nothing
here optimises the writing of code, because writing it was never the part that was slow. The
planted-violation rule exists for the same reason — a test that only proves code ran is worthless
when producing code is the cheap half.

### Incentives and game theory

**Goodhart's law — a measure that becomes a target stops being a good measure.** · `holds`
*Falsifier:* a budget that was gamed by writing worse code that scored better.
Confirmed by design rather than by accident: every budget here is a metric under target pressure, and
the defence is structural — budgets ratchet **down only**, so the only way to move one is to genuinely
improve. A raise requires a written reason and is recorded. The law held; the counter-design is what
makes the metric survivable.

**Repeated games sustain cooperation that one-shot games do not.** · `untested`
*Falsifier:* a contributor whose standing rose while their merged work got worse.
The standing model is a repeated game with a public history — the classic setup for cooperation
without enforcement. Whether earned influence actually tracks contribution quality, rather than
volume or recency, is unmeasured. *Pairs with the aggregation trap in `CONTRIBUTORS.md`.*

**Principal–agent: delegation costs you fidelity to your intent.** · `shifted`
*Falsifier:* delegated work that diverged from intent in a way no gate could have caught.
The classic problem is misaligned incentives. An agent has none, so the loss is not motivational — it
is **specification loss**, which is a different failure with a different fix: gates and planted
violations rather than monitoring and incentives. Same shaped problem, entirely different remedy.
*Evidence:* `_why_bootstrap_mjs_219_232` records the same defect shipping twice — a verify script
running `tsc` against a config that does not exist. Nobody's incentives were misaligned at any point;
the intent "write a verify that works" simply never survived contact with a repository shaped
differently. No amount of monitoring would have found it; a negative control did.

### Classical

**Theory of Constraints — improvement anywhere but the constraint is an illusion.** · `holds`
*Falsifier:* a local optimisation away from the constraint that raised total throughput.
Load-bearing throughout `DECIDING.md` and repeatedly useful in practice — most visibly when
reviewing eight branches serially was subordinating a non-constraint, and five of them could land in
parallel because they could not reach the surface that mattered.
*The subtlety worth keeping:* constraint succession is not a queue. The next constraint is not known
until the current one moves, so planning two moves ahead is planning against a guess.

**Chesterton's fence — do not remove what you do not understand.** · `holds`
*Falsifier:* a removal that improved things and whose reason turned out not to matter.
The `_why_` keys in `arch-budget.json` are this claim implemented: each records why a fence is where
it is, specifically so a later reader can decide rather than guess.
*Evidence:* `_why_dupe_scan` is the case that proves it. An earlier comment defended six copies of a
preamble on a rationale that turned out to be **false**, and the replacement says so explicitly —
precisely so a future maintainer who trims it back does not re-import the same mistake. The fence had
a bad reason, and finding that out required the reason to have been written down.

**Hyrum's law — every observable behaviour will be depended on.** · `untested`
*Falsifier:* changing an undocumented output shape and nothing breaking.
Directly relevant and unexamined: the gates emit JSON that athletes parse, and `runnerUp` was emitted
by four scanners with zero consumers — the inverse case. Whether anything depends on the shapes
nobody documented is unknown.

---

## Adding one

Cheap, and a genuinely useful contribution:

1. State the claim in one sentence, in the form its original author would recognise.
2. **State the falsifier** — what would have to be observed *here* for it to be wrong. Required.
3. Set the status to `untested` unless you actually ran something.
4. If you moved a status, say what the evidence was. A status change with no evidence is an opinion
   with a table cell.

**Do not add a theory because it is famous.** Add it because you are about to rely on it.
