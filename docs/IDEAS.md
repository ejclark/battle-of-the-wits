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

**23. A contributor's own project is the portability evidence this repo has never had.**
The framing to resist is that outside projects are leakage. This harness's own status line says
*proven in exactly one codebase*, and its doctrine says the real test is expressing it somewhere it
did not grow. `tests/portability.test.mjs` simulates that with a deliberately unfamiliar layout — but
a simulation can only plant violations somebody already imagined, and **the first genuine adoption
surfaced three defects none of which the suite's author had thought of** (hardcoded `src/` prefixes,
skynet-specific exemptions, a crash when `knip` was absent).
So a second person running this on their own repository produces the one kind of evidence that cannot
be manufactured here. Concrete work it unblocks: a second real `harness.json` in the wild, an
adoption sequence walked by someone who did not write it, and every gate meeting a toolchain nobody
anticipated. **The return route is an issue on the snag form**, which someone here turns into a
planted-violation case — the LESSONS.md loop extended one repository outward. Pairs with #2, which
asks what a harness boundary would carry; a second harness in use is what would answer it.
_(src: Eric · while: weighing whether to steer a contributor toward our systems or their own)_

**24. The onboarding surface is mechanically complete and has zero evidence.**
Counted today: 9 drills, 8 agents, 3 issue forms, 3 reader-facing docs, a roster, a zoning table and
a loop. **Contributors who have run any of it: zero. Issues filed: zero.** Every author on `main` is
the owner or a bot.
That is not a complaint about pace, it is the same finding as #9 stated at the level of the whole
surface: a system whose central claim is *a non-technical person can follow this* is complete when a
non-technical person has followed it, and not before. By this repository's own standard the current
state is a scanner aimed at a directory that does not exist — everything reports green because
nothing has been run. **The next real increment is not another drill. It is one person walking
through and marking where they stopped**, and any further building before that is guessing at defects
instead of collecting them. _(src: Claude · while: asked whether the onboarding dungeon is nearly
complete)_

**25. A tutorial "engine" is a routing table, not a program.**
The ask was a choose-your-own-adventure tutorial. The thing that actually needed building was much
smaller: a conversation already IS a choose-your-own-adventure, so the missing piece was the routing
table and the discipline of naming the route — which is `/orient`, one file.
Worth keeping as a caution against the version that sounds better. A rendered tutorial with tracked
state would be a **second store of orientation content** that drifts from `docs/` exactly the way a
wiki would (#22), plus a state machine to maintain, plus a surface no gate can check. The
generalisable form: **before building an engine, check whether the model already running is the
engine.** Where it is, what is missing is a table and a rule. _(src: Eric · while: "this needs a
tutorial engine … a bit of choose your own adventure")_

**26. Adopt mise — after stability, not before it.**
Recommended by a source the owner rates highly, and the honest check says the problem is real but is
**not the one mise is usually sold for.** Node is already pinned by `.nvmrc` and every tool reads it.
The genuine gap is **shellcheck**: `tests/shell.test.mjs` prints *"shellcheck not installed locally —
skipped here; CI still enforces it"*, and `tests/parity.test.mjs` carries an explicit carve-out for
the `apt-get` step that installs it. So CI installs a tool the local suite needs and does not have —
the one place local verification is weaker than CI, in a repository that already banked the lesson
that *a verification step existing only in CI turns a typo into a commit-push-wait cycle.* That lesson
moved the CHECK into the suite and left the TOOL behind; mise closes it, cross-platform, from one
config, alongside node.
**Deliberately deferred**, and the reason is the constraint moving rather than the tool being wrong —
see #27. **Boundary when it happens:** adopting it in THIS repo is repo state, the same class as
`.nvmrc`. Shipping `mise.toml` in the templates is not — that imposes a toolchain on adopters, which
is the one rule. **Falsifiable test to set before adopting:** does `npm test` stop printing
"shellcheck not installed locally"? If it still does, it solved a problem we did not have.
_(src: Eric · while: "I've heard a lot of excellent things from my mentor about MISE")_

**27. The constraint moved to STABILITY the moment there was a customer — and the succession table
guessed wrong.**
`DECIDING.md` §4 tracks constraint succession and named *knowing what is worth building* as plausibly
next after human attention. It was wrong, and the way it was wrong is the useful part: the constraint
did not advance along the axis the table was watching. **A customer arrived, and the binding thing
became stability of the surface they touch.**
That is exactly what the Theory of Constraints entry in `METAPHORS.md` warns about — *"a model of the
constraint that nobody re-derives is just a slogan"* — and it is the second time this project has
recorded the constraint moving somewhere unpredicted (the first was trust in the rails). The
generalisable form: **constraint succession is not a queue.** An external event can promote a
constraint that was not next in line, and a table of expected succession is a prompt to re-derive
rather than a forecast to follow.
Practical consequence, immediately: process improvements that touch machinery a contributor will meet
now wait behind stability, and that is a reordering rather than a rejection. _(src: Eric · while: "now
that we have customer of our product we need to ensure product stability")_

**28. `.nvmrc` says 24, `package.json` engines says >=22.**
Two sources for one decision, disagreeing. Not currently breaking anything — `>=22` is satisfied by
24 — but it is precisely the drift class this repository has gates for elsewhere, and the version
someone's toolchain picks depends on which file it happens to read. Small, mechanical, and worth
fixing before it is load-bearing. _(src: Claude · while: checking whether this repo has the problem
mise solves)_

**29. ~~There is no update path for materialised files at all.~~ RESOLVED — the question was malformed.**
_Shipped 2026-08-02 as projen synthesis (`docs/adr/0001`). The checksum design below is NOT what was
built, and the difference is the useful part: it tried to tell "customised" from "merely old" AFTER
the fact. projen removes the distinction instead — you never customise the artifact, you customise
the generator, and regeneration IS the update path. Read the rest as the reasoning that made the
replacement obvious, not as work outstanding._

**Original entry — There is no update path for materialised files at all — evergreen starts here, not at breaking changes.**
Tested rather than assumed. `harness-bootstrap` re-run against an adopter with existing files prints
*"nothing to write — every file already exists · skipped (already present — yours wins)"*. **An
adopter who ran it once has permanently frozen templates.** Not just for breaking changes — for any
change. A `biome.json` deliberately mangled to look stale was left untouched.
"Yours wins" is CORRECT for a file someone customised and must not be clobbered. The defect is that
**the system cannot tell "customised" from "just old"**, so it treats every file as customised and
nothing ever reaches anyone. That single missing distinction is what blocks the whole evergreen idea,
and it is small: **record a checksum of what the harness WROTE, at write time.** Then three states
become distinguishable — unmodified and current, unmodified and stale (safe to update), modified
(never touch, offer a diff).
Layering once the primitive exists, and the middle row is not negotiable:
| File class | Auto-update? |
|---|---|
| config with no blast radius, unmodified (`biome.json`, `.npmrc`, `.nvmrc`) | yes |
| **`.github/workflows/`, anything credential-adjacent** | **never — see #30** |
| anything the adopter modified | never; show the diff, they decide |
Trigger: the first template change that actually needs to reach an existing adopter. Today there are
none, and there has never been a breaking change in this repository's history. _(src: Eric · while:
"we need to be capable to automerge all forms of breaking changes")_

**30. The evergreen-browser model is the opposite of auto-merging breaking changes.**
_Update 2026-08-02: the hard boundary in this entry — "this harness writes `.github/workflows/`" — is
no longer true, and that is the point. The pipeline is now a REUSABLE workflow the adopter calls at a
ref they pin, so improvements reach them without anything rewriting their CI. The boundary is held by
construction rather than by policy. The migration half is built too (`harness migrate`, ADR-0001), so
"a breaking change ships with its migration" is now mechanism rather than intent. The rest stands._

Worth writing down because the analogy is good and points the other way. **Chrome is evergreen
because it almost never breaks compatibility**, not because it ships breaks faster. Silent
auto-update is the EASY half; the hard half is "don't break the web" — deprecation cycles measured in
years, migration tooling, and telemetry from billions of installs telling them what would break
before it does. Shipping breaking changes automatically without that machinery is not the Chrome
model, it is the Chrome model with its expensive half removed.
The achievable version of the same goal, and it is genuinely good: **a breaking change ships with its
migration, or it does not ship.** The harness owns the migration; the adopter runs one command and is
current. That is `ng update`, Next.js codemods, Rector — and unlike "automerge everything" it is
gate-able: no `BREAKING CHANGE` footer merges without a migration step alongside it.
**The hard boundary either way:** this harness writes `.github/workflows/`, and `harness-preflight`
refuses workflow edits to EVERY principal including the owner, because that file decides what runs
with the repository's credentials. An auto-update that silently rewrote an adopter's CI would be the
harness doing, in someone else's repository and with their credentials, the exact thing it forbids
everyone from doing in their own. Chrome does not have write access to your build system. Pairs with
#29. _(src: Claude · while: checking the update path against the evergreen claim)_

**31. Token burn: setup is nearly free; the CONTEXT SURFACE is the cost — and it is measurable today.**
Measured rather than guessed. `harness-bootstrap --auto` is deterministic Node and **calls no model
at all**, so day-one setup costs approximately zero tokens. The token cost of "setting up the
harness" is entirely the conversation around it, which the harness cannot see.
What it CAN see, and what actually matters, is the **context surface** — what a session must read to
act correctly:
| | tokens (~4 bytes/tok) |
|---|---|
| `CLAUDE.md`, loaded every session | ~1,400 |
| doctrine (8 docs) | ~32,200 |
| drills (13) | ~26,000 |
| agent definitions (8) | ~9,300 |
| **ceiling, if something read everything** | **~75,000** |
The ceiling is alarming and misleading: nothing loads all of it. A realistic session is `CLAUDE.md` +
one drill + the doc that drill cites ≈ **11,000 tokens**, which is comfortable on a Pro plan. But the
biggest single items are worth knowing — `onboard/SKILL.md` ~7.7k, `CONTRIBUTORS.md` ~7.1k,
`COACHES.md` ~6.9k — because a drill that cites three docs is a 25k session before any work happens.
**The actionable rule this suggests: a drill should cite at most one doctrine document.** Cheap to
check, and it bounds the surface without shortening anything.
_(src: Eric · while: "we should capture token burn when customers setup our dungeon crawler harness")_

**32. The claim that this harness LOWERS token consumption has never been measured.**
`COACHES.md` already asserts the mechanism — *"a model-in-the-loop procedure costs tokens every time;
a script is a one-time build cost, then ~free per run forever"* — and like the flywheel claim (#18)
it is stated as fact and checked by nothing. It is also the claim that decides whether a $20 plan can
run this, so it is worth more than most things in this log.
**Falsifiable form:** *tokens per merged change falls after adoption, and keeps falling as loops get
codified.* Two things must be right or the number lies. **Normalise per merged change**, not per
week, or a quiet fortnight reads as an improvement. And **separate the one-time cost from the
recurring one** — adoption is a spike, and averaging it into the steady state hides both.
**The capture primitive already exists and needs no new mechanism**: `harness-log --event setup
--tokens N` works today, because the ledger takes arbitrary fields. What is missing is the EMITTER,
and it can only be the Claude session — the harness has no visibility into its own token cost. That
is the whole gap, and it is one instruction in a drill, not a system.
**On the 50–100x figure**: that is enthusiasm rather than a measurement, and it should be held to a
measurement's standard before it is repeated anywhere a customer can read it. The honest version is
that nobody knows the multiple yet, one adopter is about to generate the first data point, and a
number published before it is measured is the thing this project refuses everywhere else.
Pairs with #15 — a database becomes right at a stateable, unanswerable query, and this is finally a
**stateable** one; it is just not unanswerable, because JSONL plus `jq` covers it for years.
_(src: Eric · while: "ideally, our harness lowers the token consumption")_

**33. The API-cost leg of the batching argument has lifted — verify, then spend the headroom on smaller PRs.**
`COACHES.md` prices the GraphQL bucket as scarce and the governor batches a whole cycle into one pull
request partly to conserve it. **That was measured on a private repository.** This one is public,
which changes the rate-limit picture substantially, and the observation is that the limit stopped
binding.
**Falsifiable form, because this is an observation and not yet a measurement:** run a normal week of
governor cycles and check whether any run is refused or throttled on rate limit. None means the leg
is genuinely gone. Cheap to check and worth checking, because a constraint quoted out of habit is
exactly what the ToC entry in `METAPHORS.md` warns about — *a model of the constraint that nobody
re-derives is just a slogan*, now recorded three times in this project.
**What the headroom buys, and it is the thing worth spending it on:** smaller pull requests, more of
them, in parallel. The case has strengthened independently — a commit is the boundary at which a
retro reads its timeline instead of reconstructing it (#16), a gate failure against a small surface
is attributable and against a large one is not (#13), and independent revert is worth more when
several reps land together. Two lighter legs remain (CI minutes, release-note noise) and both should
be checked rather than assumed. _(src: Eric · while: "as long as automerge API limit is not at risk,
we can afford more PRs to create smaller increments of work")_

**34. Derive the API rate rather than quoting it — `harness-budget --api`.**
`COACHES.md` now documents the API constraint as a **structure** (separate buckets that do not share
a budget, per-point rather than per-call cost, visibility changing the picture, polling as the
dominant waste) with the numbers marked as runtime inputs. The natural completion is a script:
sustainable operations per hour is `limit ÷ cost-per-operation`, and **both terms are readable rather
than assumed** — the limit from the API's own rate-limit endpoint, the cost by differencing across one
real operation.
That would make the batching decision *measured* instead of *quoted*, which is the difference this
project insists on everywhere else, and it would have caught the thing that just happened: doctrine
citing a private-repo figure long after the repository went public. It must **degrade honestly** —
no token or no network means "cannot measure", never a guessed number — and it must **never poll**,
which would be the tool becoming the waste it exists to measure.
**Not built now**: nothing consumes the number yet, and building a measurement with no consumer is
the thing this log has declined four times. The trigger is the first time a batching or dispatch
decision actually turns on headroom. Until then the doctrine's own rule stands — anything that needs
this number should compute it. _(src: Eric · while: "the rate to regulate is a generated byproduct of
the variable limit we can plug in and derive on the fly and/or script")_

> **The trigger fired.** `gear.mjs` consumes headroom to set the ceiling on effort, so the "no
> consumer" objection that held this back four times no longer applies. What it reads today is the
> *declared* limit (`HARNESS_TOKEN_LIMIT`) against measured burn — the half that still needs building
> is reading the limit from the API rather than being told it, which is exactly what this entry
> describes. It is now unblocked rather than merely banked.

**35. Raid size is the horizontal axis of the question `gear` answers vertically.**
Dungeons come in sizes — solo, party of five, ten/fifteen/twenty/twenty-five/forty-man raid — and the
size is not decoration, it is **how much force the encounter needs**. That is the same question
`GEAR.md` asks, rotated ninety degrees: gear is *how much thinking per worker*, raid size is *how many
workers*. Both should fall out of the same evidence, and today only one of them does — `fleet.mjs`
dispatches a number of athletes nobody derived.
The interesting part is that the two axes are not independent and probably trade against each other:
a forty-man raid of mechanical workers and a solo run at `deep` are different answers to one budget,
and knowing which is correct for a given encounter is a real question this project has never asked.
Cheap version first: **name the sizes**, map them onto the fleet count the governor already picks, and
let the naming expose whether the count was ever derived from anything.
**Explicitly deferred by Eric:** the tier *below* a dungeon — the enormous volume of work too small to
be an encounter at all — has no metaphor yet, and inventing one to fill the hole is how a metaphor
stops being load-bearing and starts being decoration. `METAPHORS.md`'s rubric would reject it on the
breaking-point requirement. Leave the gap visible. _(src: Eric · while: "dungeon sizes vary in
concept… there are also many tasks lower than a dungeon, I'm not sure how to weave that into the
dungeon theme at this time.. a problem for another time")_

**36. The one-shot should end at a running page in a browser, not at a green verify.**
A green `verify` is legible to someone who already knows what a verify is. For a beginner the
tangible outcome is *a thing on screen that changed because they typed something* — and the gap
between those two is most of what makes early engagement stick. A local dev server that opens the
browser itself (rspack/vite, `--open`) turns every prompt into an observable result, and observable
results generate the next idea, which is the loop `/spark` is trying to start by conversation alone.
This is the same argument `spark` already makes from Deci & Ryan: the missing leg when someone stalls
is nearly always **competence**, and nothing supplies competence like seeing your own change render.
Scoped narrowly it is small: `harness-bootstrap --auto --demo` writes a minimal page, a dev script,
and opens it. Scoped wide it is a framework opinion the harness has no business holding — so the
line is that the demo must be **deletable in one command** and must never be a dependency of the
gates. _(src: Eric · while: "instant gratification demos are often times the most impressive for
beginners")_

**37. A dashboard front end — and `harness-map` is already half of it.**
`cartography.mjs` renders a repository to a standalone HTML document today; what does not exist is
**progress and state over time**, and **more than one repository at once**. Those are different
gaps: the first is a read over the run ledger and the budget history (both already committed,
append-only, and queryable), the second needs a notion of a fleet of adopted repos that the harness
does not have at all.
The honest sequencing is that the first is nearly free and the second is a real design. Pairs with
#38, which is the same missing concept approached from the other side, and with #31 — a dashboard
that cannot show what a run cost is missing the number everyone actually wants.
_(src: Eric · while: "this could help measure progress and state as well as a dashboard of projects
users have imported")_

**38. Importing an existing repository into the fleet — map first, then maintain.**
Today adoption assumes you are starting the harness fresh in a repo. The bigger case is a repository
that already has years of structure, where the valuable first act is not to impose the process but to
**map what is already there** — districts, budgets, seams, principals — and hand back that map. The
adopter then sees their own codebase described before being asked to change anything, which is a
completely different proposition from a tool that greets them with a list of violations.
Every piece of the mapping exists (`model.mjs`, `principals.mjs`, `cartography.mjs`); the missing
part is the **fleet** — a notion of many mapped repositories that `harness-map` and any dashboard
could range over. That concept is the shared prerequisite with #37, and it is the thing to design
once rather than twice. _(src: Eric · while: "including a repository in the dungeons fleet — needs to
integrate existing code to build out the mapping of the existing dungeons")_

**39. PR size is a moving target, so stop targeting a size and target a BOUNDARY.**
The usual advice — small, frequent PRs — is right about the failure it prevents and wrong about the
mechanism. A two-week PR is not bad because it is *large*; it is bad because `main` moved underneath
it, so the cost is **divergence over time**, not lines changed. That reframing matters because the
two come apart: a 900-line change written and merged inside an hour carries almost no divergence
risk, while a 40-line change open for nine days carries a lot.
So the measurable thing is not diff size, it is **age against the rate main is moving** — both of
which this repo can already read from git. And the natural cut point is not a line count either: it
is the **fault line**, the same boundary the retro doctrine already uses, and the same one the commit
discipline here follows. Where a change reaches a state that is coherent, green, and reviewable on
its own terms, that is the PR — whether that is 40 lines or 900.
Cheap version: a preflight warning when a branch's age × main's commit rate crosses a threshold,
which says *"main has moved 14 commits since you branched"* rather than *"your PR is too big."* The
first is a fact the author can act on; the second is a rule they will argue with. Pairs with #33.
_(src: Eric · while: "2 week open PRs is still bad, because the ideas/changes on the main branch
could have significantly evolved during that span")_

**40. Precision about words is right; a dictionary is the wrong instrument for it.**
The instinct is correct and it matters more here than in most repositories, because **this project's
product is prose.** Its entire quality argument rests on words that mean exactly one thing, and the
distinctions doing real load are fine ones: *grandfather* vs *freeze*, *refuse* vs *block* vs
*reject*, *gate* vs *check*, *ratchet*, *drill*, *athlete*, *principal*, *zoning*, *standing*. An
etymology habit — reaching for the word that means precisely the thing and nothing adjacent — is a
drafting discipline worth holding explicitly, and it costs nothing to hold.
**But the failure it would fix is not the failure we have.** A dictionary tells you what a word means
in general. The problem here is that this repository has **assigned private meanings to ordinary
words** and never written the assignments down — Webster's will not tell anyone what *gate* means in
this repo, where it appears over three hundred times. That gap is `docs/GLOSSARY.md`, it is already
task 1 on the on-ramp, and it is **reserved** because it has to be written by someone who did not
know the words. Vendoring a corpus would look like progress on it and would not be.
Also checked and worth recording: the connector registry has **no** dictionary, etymology, or general
knowledge-base server. Every documentation server in it is a vendor indexing its own product.
_(src: Eric · while: "websters dictionary type packages seem great to be aware of etymology")_

**41. The gates wrap third-party tools and nothing pins them to those tools' real contracts.**
This is the version of "install the documentation" that has already cost something. `dead-scan.mjs`
read a top-level `files` key from knip's JSON reporter that **knip does not emit** — so unused files
were structurally invisible, the gate printed `0 ≤ 0`, and `npx knip` named a file the gate could not
see. It went green for months. The fix came from reading knip's own `reporters/json.js`, not from
reading our code.
Six gates wrap outside tools this way: knip, jscpd, biome, commitlint, semantic-release, husky. Each
one is a place where our assumption about an output shape can drift from the shape without anything
going red, and the failure mode is always the same — **a confident number computed from nothing.**
The cheap, high-payout version is not a vendored corpus: it is a **contract case per wrapped tool**,
planting a violation the raw tool would report and requiring the gate to report it too. That is the
"raw tool and gate disagree" smell already logged twice, promoted to a rule.
_(src: Eric · while: "we should install documentation packages where available… feels like a
negligible tax with high payout")_

**42. An admin panel is two different things, and only one of them should exist.**
Asked directly: does the owner need an admin panel? Split the question, because the two halves have
opposite answers.
**The read half — yes, and it is already banked as #37.** Seeing state across projects, progress over
time, what each adopted repo looks like: that is a dashboard, it is genuinely missing, and
`cartography.mjs` is already half of it.
**The write half — no, and building it would violate the rule the project is named around.** A panel
that changes how the harness behaves is a control surface, and every control on it is a decision the
system declined to make from evidence. Worse, the decisions actually worth an owner's attention are
the irreversible ones — workflows, credentials, tier promotions — and those are refused to *every*
principal including the owner, on purpose. A panel would be a button for exactly the class of action
that must not have a button.
So the useful shape is a **read surface with links out to GitHub**, not an admin console. Anything
that needs changing gets changed where changes are reviewable.
_(src: Eric · while: "would it make sense for me to have an admin panel?")_

**43. The demo app's customisation surface is where the preference/backlog rule gets its first real
test.** The starter to-do app (#36) will immediately attract "can it also…", and every one of those
is the fork `DECIDING.md §7` now describes: a preference with no right answer, or a feature request
with an unfound one. This is a good first test of that rule precisely because the pressure to ship
settings is highest where the user is a beginner and saying no feels unkind.
The mechanism that makes saying no cheap is already built: `harness-report` composes a complete,
prefilled GitHub issue from local files at zero token cost. **The starter app should carry the same
affordance** — an in-app "this should do X" that produces a filable issue rather than a setting. That
turns every customisation impulse into signal instead of surface, and it teaches the loop this whole
project runs on to somebody on their first day, using their own idea as the example.
Watch for the failure: an app whose settings screen grows faster than its features is a backlog that
got shipped instead of written down. _(src: Eric · while: "whatever we allow them to customize should
be managed as preferences or routed through backlog as feature requests")_

**44. Docker: right answer, wrong problem, and the trigger that would change that.**
Proposed as the fix for cross-platform support — containerise development, stop maintaining two
platforms. The argument is sound in general and does not survive the specific numbers.
**What the dual-support burden actually was, measured rather than estimated: two defects.**
`command -v` in `resolveTool` (a POSIX shell builtin Windows lacks — six lines), and instructions
naming `bin/harness-*` launchers that start `#!/bin/sh` (say `node <module>` instead — free).
Everything else is Node, which was already cross-platform. That is the entire burden Docker would
have eliminated, and it is now paid.
**What it would have cost:** Docker Desktop on Windows is a multi-gigabyte install needing WSL2,
sometimes a BIOS change, and a licensing conversation inside a company — paid by the newcomer, on day
one, before anything has worked. That trades a burden WE carry, small and already spent, for one the
USER carries, large and worst-timed. It also contradicts the claim the product is sold on: adoption
is an install, not a port.
**And structurally it does not do the job.** Claude Code runs on the host. A containerised harness
puts the agent outside and the tools inside, so every gate invocation crosses a boundary — that is
not removing a platform seam, it is adding an integration seam in the hot path.
**The trigger that flips this**, and it is worth watching for: the day the harness needs anything
beyond Node and git — a pinned Python, a native binary, a database. At that point reproducibility
stops being free and containerising is correct. Until then this is a real breaking change bought to
solve a problem worth about six lines. _(src: Eric · while: "given the windows scenario.. that might
be the time to pivot towards docker")_

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
  **Built** — `tests/shell.test.mjs` asserts the owner *and* other execute bits on all 23 launchers,
  verified against one stripped to `644`. Deliberately not the `.cmd` twins: Windows has no mode, so
  asserting one there would test the checkout rather than the file.

- **The gates do not look at `web/`.** `harness.json` names one `sourceDir` (`plugins`) and one
  `sourceExt` (`.mjs`), so the client-side app added for the dev server is measured by nothing —
  not size, not duplication, not copy-paste, not the spec gap. Knip was pointed at it, which covers
  dead code and nothing else. This is unmeasured, not clean, and it is the same false green the
  gates exist to prevent, arriving through a directory nobody told them about. The fix is a
  descriptor that accepts more than one source root, which is a real change to `DESCRIPTOR.md` and
  to every scanner that reads it. _(src: Claude · while: adding the rspack dev server, and noticing
  the gates stayed green about 500 lines they had never read)_

**45. Eleven bare catches have a fallback indistinguishable from a real answer — audit them.**
Banked straight out of the incident it caused. `renderDescriptor` called a function it had stopped
importing; the `ReferenceError` landed in a `catch {}` whose fallback was `null`, which is a
**legitimate value** there. A crash became "this repo has no test script", and the only thing that
noticed was a planted test. The narrowed catch fixes that one site; a grep says there are at least
eleven more of the same shape across `plugins/*/lib` — `return null`, `return {}`, `return []` behind
a bare catch.
Not all of them are wrong. `overview.mjs` says so explicitly and correctly: *"a corrupt line is one
bad record, not a reason to report nothing."* The ones to hunt are narrower — where the fallback is
also what SUCCESS looks like, so a defect and a legitimate absence are indistinguishable afterwards.
That is the same family as `cmd | tail` reporting exit 0 on a red gate, hit live in the same session.
**Cheapest prevention is probably one helper, not eleven edits:** most of these are "read a file,
parse it, tolerate missing or malformed". A shared `readJsonOr(path, fallback)` that swallows
`SyntaxError` and `ENOENT` but rethrows `ReferenceError`/`TypeError` would collapse the duplication
the dupe gate would flag anyway AND make the wrong version unavailable. Worth doing when something
else already touches those files, rather than as a flag-day sweep.
_(src: Claude · while: banking the lesson from the catch that hid a missing import)_

## In progress

_(nothing yet)_

## Shipped (recent)

- **#29, the update path** — resolved by adopting projen rather than by building the checksum design
  it proposed. Generated files are regenerated; seeded files are never touched. *Evidence:
  `docs/adr/0001`, `projen/index.mjs`, `tests/projen.test.mjs`.*
- **The gates run where CI runs.** Plugin code is only reachable inside a Claude Code session, so the
  scanners could not measure the place that most needed measuring. *Evidence: `package.json` bin
  entries, and `skynet-capital` running them from `node_modules/.bin` with byte-identical verdicts.*
- **Shape vs. content.** The harness owns the STRUCTURE of a repo's contextual systems and never their
  contents — twenty new ideas are invisible, one new field is a promotion candidate. *Evidence:
  `plugins/harness-gates/lib/shape.mjs`, `tests/shape.test.mjs`.*
- **Config ratchets.** Locked / Ratcheted / Free, closing the hole that unrestricted overrides opened.
  Grandfathers on day one. *Evidence: `plugins/harness-gates/lib/sanitation.mjs`.*

- The contributor model — principals, zoning, standing, `/onboard`, `/intake`, and the worst-case
  catalog. The rope team and the mountain/ocean crossing entered the metaphor catalog with it.
