# Ideas & Backlog

The durable home for ideas, so they leave the working context without getting lost. Eric injects
thoughts; Claude routes each one here. The in-session task list is the working subset — this file is
the permanent record.

This repository shipped an idea-log *reader* (`plugins/harness-core/lib/ideas.mjs`, which ranks open
ideas by how many other ideas point at them) before it had an idea log. Until this file existed, the
drawing-board campaign returned `null` here — the harness could read a backlog in every repository
except its own.

**Attribution:** every entry records source and proximity — `_(src: Eric | Claude · while: …)_`.
Eric-sourced entries are **intent**; Claude-sourced ones are **proposals to prune**.

**Ranking:** entries reference each other as `#N`. In-degree — how many other ideas point at one — is
a **proxy** for load-bearing, not a verdict, and nothing computes a priority on its own.

---

## Inbox (captured, not yet started)

**1. Map and visualise Conway's Law — with physical evidence from the code.**
The claim that a system's structure mirrors its organisation's communication structure is usually
asserted and rarely *shown*. This harness already derives a structural model of a repository
(`model.mjs`: districts, buildings, budgets) and now derives a model of its principals
(`principals.mjs`: who writes what, measured from git). Those two together are the raw material for
actual evidence: **which districts does each principal touch, and do the seams in the code fall where
the seams between people are?** A district only one person ever touches is a bus factor; a district
everyone touches is a coordination cost that the architecture is paying for on the org's behalf.
Neither is visible today from either model alone.
The sharp version aims at the AI-era failure this repo already guards against in `COACHES.md`:
**agent proliferation reproducing an org chart in software** — coordinators spawned per layer,
delivering the redundancy of the meeting they were modelled on, at full token cost. If Conway drift
can be *measured* rather than argued, it becomes a gate rather than an opinion. Pairs with #2, which
would give the fault lines a name. _(src: Eric · while: designing the foreman tier and the
contributor model)_

**2. Harness-to-harness interfaces — abstract the boundary, not just the repository.**
Today a harness integrates *into* a repository. If harnesses could present an interface to each
other, the boundary between two subsystems would become a **declared fault line** rather than an
implicit one, which is what makes granular, autonomous integration possible as collaborators
multiply. The honest tension, and the reason this is banked rather than built: **it could equally
produce indirection** — a layer whose only job is to forward, which is the same antipattern #1 names
in the agent dimension. The thing to resolve before building is what the interface would *carry* that
a descriptor plus a set of gates does not already carry. If the answer is "nothing yet", this waits
until a second harness exists to talk to. _(src: Eric · while: thinking about scaling to more
collaborators)_

**6. The team captain — a peer role that only exists at scale.**
Named as a candidate orchestrator; it is not one. Coach and foreman hold *delegated* authority and can
be handed to someone on day one because a contract makes it safe. A captain's authority is *conferred
by standing among peers*, cannot be assigned, and produces nothing if granted to someone who has not
earned it. It is what the `steward` tier already is, seen from the social side — and its one real job
is the failure `CONTRIBUTORS.md` admits it cannot mechanise: absorbing the socially expensive "no", at
a fraction of what the owner saying it costs. Trigger: roughly four or more active contributors with
at least one at steward by evidence. Until then the owner holds it. _(src: Eric · while: mapping
orchestrator roles onto the coaching staff)_

**7. `runnerUp` is emitted by every scanner and consumed by nothing.**
`arch-scan`, `dupe-scan`, `spec-gap-scan` and `clone-scan` each emit a `runnerUp` alongside
`candidate`, and no caller reads it. That is a second read sitting in the data, unspent, because
nothing was permitted to take it — the governor dispatches the #1 candidate sight-unseen, on a score
computed from line and export counts that has never opened the file. This is the concrete work behind
the foreman tier in `COACHES.md`: the first entity allowed to say "the gate's top pick has no seam;
take #2". Pairs with #8. _(src: Claude · while: designing the foreman tier)_

**8. A dead athlete and a refusing athlete are the same event.**
Fleet slots and territory claims both carry a TTL and are pruned silently on read
(`registry.mjs`). An athlete that crashed and an athlete that correctly found nothing safe to do
produce identical evidence: an expired entry and no report. Standing down is a legitimate outcome and
should be *recorded* as one — the learning coach's whole metric is detection lag, and this is a class
of failure the system currently cannot see at all. _(src: Claude · while: designing the foreman tier)_

**9. Nobody non-technical has read `/onboard`.**
It is a long shipped procedure whose entire claim is that a non-technical person can follow it, and
that claim has no evidence behind it. By this repository's own standard that is a scanner aimed at a
directory that does not exist: it finds no problems and exits 0. The substitute for a planted
violation is the first contributor reading it cold and marking every place they stopped, **before** it
is relied on — which is also exactly the contribution `/intake` says they are uniquely able to make.
Make it their first one. _(src: Claude · while: an adversarial review of the onboarding work)_

**10. Route a new contributor's first changes through Claude as reviewer of record.**
The cheapest available relief for worst-case #6 (rejecting a spouse's or close friend's change), which
`CONTRIBUTORS.md` marks as having no mechanism. If the first "no" a contributor receives is
impersonal, it costs what a red gate costs rather than what a person costs — the same reason the gates
say no first. Requires no new mechanism, which is most of its appeal. _(src: Claude · while: an
adversarial review found this was the only unmechanised entry nobody had reached for)_

**11. Antipatterns whose premise AI has quietly invalidated — audit the whole set.**
Brooks's Law was the first one caught, and it did not fall over: it **re-partitioned**. Onboarding
cost is orientation + first-pass verification + judgement + relationship; AI collapsed the first two
toward zero and left the last two untouched, so the slope of the cost curve dropped sharply while its
floor did not move at all. The floor now dominates, which means the classic advice ("adding people to
a late project makes it later") is being applied to a cost structure that no longer exists.
The generalisable move: **an antipattern is a claim about a cost ratio, and AI changed a lot of
ratios.** Others worth the same treatment — "don't rewrite, refactor" (rewriting got cheap; verifying
did not), "premature abstraction" (the cost of the wrong abstraction is now mostly the cost of finding
it again), "documentation goes stale" (a doc that regenerates from source has a different half-life),
"don't repeat yourself" (a copy you can re-derive is not the same liability as one you must maintain).
The discipline that keeps this honest is the one that caught the first case: **name which ratio moved,
and check whether the part that did not move is now the binding one.** An antipattern whose expensive
half got cheap is not repealed — it is relocated, and it is most dangerous in the window where people
still quote the old form. _(src: Eric · while: pushing back on the rope-team throughput prediction)_

**12. Resilience is an axis Theory of Constraints does not price.**
ToC optimises flow through a system it assumes will keep existing. It says nothing about variance, bus
factor, or the probability the project survives its owner being unavailable for a quarter. A second
contributor can be **throughput-negative and survival-positive simultaneously** — both true, not one
consoling the other. Today every decision surface here scores on the throughput axis, because that is
the axis with a theory attached, which is the streetlight effect in doctrine form. Open question worth
real thought: is there an honest, derivable resilience measure? Candidates visible from committed
state — how many principals have touched each district (bus factor per subsystem), how much of the
system has exactly one author, how much reasoning exists only in one person's head versus in
`LESSONS.md` and the ADRs. Pairs with #1, which needs the same principal×district matrix.
_(src: Eric · while: the same pushback — "the system becomes more resilient at the same time")_

**13. The gates fire after the writing is finished — pull the feedback left.**
Measured on the contributor-model run: eight distinct gates failed at least once, ten budget
round-trips followed, and roughly **half of the 29-minute build span was rework driven by feedback
that arrived late**. Every one of those findings was a true positive, so the gates are not the
problem — their *position in the loop* is. They run in `npm test`, which is the end.
The repo already learned the outer version of this lesson ("a verification step that only exists in
CI turns a typo into a commit-push-wait cycle") and fixed it by moving shellcheck into the suite. This
is the same lesson one level deeper: **a check that only exists in the suite turns a stray line into a
write-test-fix cycle.** The scanners are individually fast and already runnable. The missing piece is
a single pre-commit sweep — something like `harness-preflight --gates`, running the scanners against
the working tree so the arch/dupe/clone/spec-gap answer arrives while the file is still open rather
than after the commit message is written. Pairs with #5. _(src: Claude · while: a retro on the run
that built the contributor model)_

**14. Wire gate outcomes into the ledger, so detection lag stops being reconstructed by hand.**
`harness-log` exists and the ratchet already emits on every budget move, in both directions. What is
still hand-reconstructed is the thing the learning coach actually measures: **how long between a
defect landing and something noticing.** The pieces are all present — gates know their own result, the
ledger takes a `gate` record, and git knows when the cause landed — and nothing joins them. The
cheapest wiring is a pre-commit or CI hook calling `harness-log --event gate --gate <n> --result
<pass|fail>`, which also answers "which gate fires most", the number that says where rework lives.
Deliberately not wired into the scanners themselves yet: that is six edits and a budget raise for a
signal nobody has queried once. Pairs with #13. _(src: Claude · while: building the run ledger)_

**15. A database becomes right at a stateable, unanswerable query — not at a row count.**
Banked as the standing decision so it is not re-litigated. Git is already an append-only,
content-addressed, fully historical store, and every number in the first retro came from it with no
infrastructure. JSONL plus `jq` covers a decade of this repository, and DuckDB or SQLite is one
command away when it does not. The trigger to revisit: a real question that can be **stated** and
**cannot be answered** from the ledger and git together — because that question specifies the schema,
and building storage before it exists means guessing the schema. The hard constraint any answer must
clear first: an adopter installs plugins, they do not stand up Postgres, so whatever arrives is a file
or it lives in the target repo rather than in the harness. _(src: Eric · while: "we likely need to
invest in database infrastructure to organize our information")_

**16. Commit size is the sampling rate of learning — measure the trend, do not police it.**
The `commit` records in the ledger now make commit shape a series rather than an anecdote, which
raises the obvious next question: should a gate refuse an oversized commit? **Probably not, and the
reason is worth keeping.** A file-count threshold is a proxy for "contains more than one shippable
thing", and the proxy is bad in both directions — a mechanical rename touches forty files and is one
idea, while three files can hold three unrelated decisions. A gate on the proxy would be routed
around by splitting mechanically rather than meaningfully, which is worse than no gate because it
looks like compliance. The honest instrument is the **trend**, read at a retro, next to what the
retros actually cost. Revisit only if the trend gets worse while someone is watching it, which is the
one condition under which a gate would be adding something. _(src: Eric · while: "the intent of the
retro is applied at a natural fault line; small commits relative to the task at hand")_

**17. Debt DENSITY — complexity of the dungeons relative to the world we build.**
Every budget here is absolute, so a repository that doubles in size while holding debt flat has
genuinely improved and nothing says so. Density says it: today this repo carries **3.89 duplicate
definitions and 1.39 clones per 1k lines, across 3,601 lines in 29 budgeted files** — figures
derivable right now from `model.mjs` plus the budget files, with no new measurement at all.
It is the honest way to compare a project to its own past as it grows, and the first number that
would let two repositories be compared without pretending they are the same size.
**The trap, and it is the reason this is banked rather than built: density improves by growing the
denominator.** Add code, dilute debt, look better. That is precisely the "what would someone do to
make this number look good, and would you be happy if they did" test in `DECIDING.md` §6 failing, so
density can only ever ship *alongside* the absolute number, never instead of it. The visual half —
dungeon complexity drawn relative to the size of the world — is the same figure as a picture, and it
waits for the same reason all visual work does. Pairs with #18. _(src: Eric · while: "the complexity
of the dungeons relative to the world we build")_

**18. Amplification is the SECOND derivative, and the flywheel claim has never been measured.**
`COACHES.md` asserts a compounding flywheel: "each codified loop lowers the marginal cost of the next
unit of work, so throughput compounds while cost falls." That is an amplification claim, it is stated
as fact, and **nothing has ever checked it.** The first derivative — is debt falling — is already
visible from budget history. Amplification is the derivative of *that*: is the rate at which we can
retire debt itself increasing?
There is a worked example sitting in this session's history to calibrate against: `--accept` replaced
four hand-rolled JSON round-trips with one command, so the *next* justified raise cost one invocation
instead of five minutes of scripting. That is one codification and one measurable before/after.
Two things must be right or the number lies. **Normalise by work, not by time** — retired-per-commit
rather than retired-per-week, or a quiet fortnight reads as a collapse in capability. And **the ledger
must be thick enough to carry a second derivative**, which needs far more than the ~20 records that
support a first one; a second derivative from thin data is the "hard data extrapolated" failure in its
purest form. The substrate now exists; the history does not. Revisit after a few months of boundaries.
_(src: Eric · while: "this data potentially gives us the ability to see amplification of improvements
in a measurable form")_

**19. A profile is a VIEW; the context it renders has no model — and should belong to the person.**
The GitHub profile README works at the scale of one render target. That is the constraint, and it is
worth naming precisely, because the obvious diagnosis is wrong: the problem is not that GitHub is one
*project*, it is that **the view IS the store.** What someone is working on, what they are into, what
they are stuck on — that context is bigger than any one page and changes faster — yet it exists only
as prose inside the one artefact that renders it. Re-rendering it anywhere else means writing it
again, and the two copies drift, which is the failure this harness already solved once for repository
structure: `model.mjs` derives, and the city and the map are views that may never become second
sources of truth.
**The boundary that decides whether this is good or poisonous is authorship, and it is the same line
`/profile` already draws.** A person housing their own evolving context, and rendering it wherever
they choose, is theirs and portable and outlives any project. *Us* accumulating context about them —
watching profile updates as a signal stream, assembling a picture — is the aggregation trap with
extra steps, and the sentence that prompted this supports both readings. So: whatever ever gets
housed is **authored and owned by the person, and this project holds a pointer at most, never a
copy.**
**Why it is banked and not built:** the same test that stalled #2, and the same answer. With exactly
one render target there is nothing to abstract *toward*, so an abstraction today is pure indirection
— a layer whose only job is to forward. The trigger is **a second surface that wants the same
context** and would otherwise get a hand-maintained duplicate. Cheap insurance taken now instead:
`/profile` asks its three questions and records the *answers*, treating the README as a rendering of
them rather than as the original — which costs nothing today and makes the eventual model a
formalisation rather than a rewrite. Pairs with #2. _(src: Eric · while: "github profile works at a
scale of one project/dimension… updating GitHub profile is another source to abstract and house
context")_

**20. Measure the LOOP, never the looper.**
A contributor's cycle time — first edit to merged — is the sharpest available read on how much
friction the system imposes, and the commit boundaries in the ledger already carry the raw material.
It is also one field away from a per-person performance metric, which is the artefact this project
has refused to build all along.
The resolution is the one already applied to `reverted` in the standing table: **diagnostic in a
single view, comparative in a table.** Someone seeing their own loop shorten is being handed
information they can act on and a reason to keep going; the same numbers side by side are a
leaderboard, and there is nothing to act on in learning that someone else's loop is shorter. So if
this is ever built: shown to the person it describes, never aggregated across people, and the ledger
keeps its no-actor rule by storing the interval without the identity.
**Not built now**, and the reason is the standing one: no contributor has a first commit yet, so it
would report nothing. The trigger is a handful of landed changes and a real question about whether
the first week is getting easier. Pairs with #14. _(src: Eric · while: "establish some iteration
loops and tighten them")_

**21. Evergreen propagation is mostly a non-problem for a web-UI contributor — check before building.**
The worry is that people who do not know git will drift onto stale copies. For someone working in
GitHub's web editor that does not happen: the pencil-edit branches from **current main at click
time**, with no local clone to go stale and nothing to pull. The staleness that IS real is narrower —
an **open PR** while main moves — and GitHub already ships the fix as a button, plus a branch-
protection setting requiring up-to-date branches before merge. Both are owner-side settings, not code.
Where propagation genuinely needs a mechanism is the two cases nobody was asking about: **local
checkouts** (ours) and **adopters' installed plugin versions**, which are SHA-tracked through the
marketplace and updated with `/plugin update`. Worth writing down mainly as a caution: the obvious
diagnosis pointed at the contributor, and the actual gap was somewhere else entirely. _(src: Eric ·
while: "include triggers to propagate evergreen updates — self healing patterns")_

**22. A wiki would be a second store, and it would drift.**
Raised as a feedback surface alongside issues and projects. Issues earn their place immediately —
they are the lowest-friction report a non-technical contributor can file, needing no branch, no
checks, nothing to get right. A wiki does not, and the reason is the rule this project already runs
on: **one source per idea.** Wiki pages live outside the repository, are not reviewed, are not
covered by any gate, and cannot be checked by the tests that keep `docs/` honest — so within a month
the wiki and the docs disagree and nobody knows which is current. The harness has a whole suite
devoted to preventing exactly that in code. Revisit only for content that genuinely does not belong
in the repository and needs no verification. Meeting notes, maybe. Not procedure, and not anything a
gate could check. _(src: Eric · while: "onboarding is associated with github issues, wikis, projects")_

### Side quests (surfaced by Claude while working — proposals to prune)

**3. Humans do not claim territory; athletes do.**
`harness-claim` models territory so two athletes never edit the same files. Human contributors have
no equivalent, so a human and an athlete can collide silently and the loser is whoever pushes second.
Today this is masked by a coincidence of the roster — athletes work on structural debt, new
contributors work on docs and specs — and it stops being masked the moment a human is working in
`sourceDir`. Named in `CONTRIBUTORS.md`'s worst-case catalog as a known asymmetric rail.
_(src: Claude · while: writing the human/agent collision entry)_

**4. `city-cli.mjs` is not a knip entry point.**
`harness-city`'s launcher target is absent from `knip.json`'s `entry` list, so knip reports it as an
unused file. The dead-code gate does not currently fail on it, which means the gate and the raw tool
disagree about the same repository — and a disagreement nobody has explained is a gate whose number
cannot be trusted in either direction. _(src: Claude · while: wiring `standing.mjs` into knip)_

**5. The launcher executable bit is unguarded.**
`bin/harness-standing` was committed non-executable and every invocation failed with `Permission
denied` — caught only because a portability case ran the launcher rather than the module. Every other
launcher is `755` by luck of how it was created. A one-line assertion over `plugins/*/bin/*` would
make that structural instead of lucky. _(src: Claude · while: the zoning portability case went red)_

## In progress

_(nothing yet)_

## Shipped (recent)

- The contributor model — principals, zoning, standing, `/onboard`, `/intake`, and the worst-case
  catalog. The rope team and the mountain/ocean crossing entered the metaphor catalog with it.
