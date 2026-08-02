# Roadmap

**[`docs/IDEAS.md`](IDEAS.md) is the bank — unbounded, unordered, and it should stay that way.** This is the layer
above it: what we are heading toward, in what order, and *why that order*. Only a handful of things
are ever on it, because a roadmap you cannot read in a minute is a bank with worse formatting.

> ⚠ **This first version is Claude's draft, assembled from the bank and from what this week actually
> broke. It is a proposal, and the ordering contains judgment calls that are Eric's to make.**
> Overwrite it rather than editing around it. It is marked so that nobody mistakes a proposal for a
> decision — including a future session reading this file cold.

## How this file stays honest

Three rules, and `tests/roadmap.test.mjs` enforces the first two:

1. **Every phase names what "done" looks like**, in terms somebody could check. A phase with no
   observable exit is a heading.
2. **Every phase says what it is blocked on**, or explicitly `nothing`. Half of planning is admitting
   what cannot start yet.
3. **A shipped phase moves to the bottom and keeps its evidence.** This is a record of what was
   decided and when, not a list of intentions that quietly disappear when they stop being true.

The failure this is designed against is the one the on-ramp already hit once: a document full of
confident claims that stopped being true and that nobody noticed, because nothing was checking.

---

## Now — the first contributor can finish a loop

**Done when:** somebody with no prior context lands a merged change on a machine nobody tested,
without needing Eric in the loop for anything except credentials.
**Blocked on:** nothing.

Most of this shipped this week, driven by one contributor's logs rather than by planning — which is
worth noticing, because it is evidence about where findings actually come from.

Remaining:
- ~~The `snag` and `idea` labels~~ — created, so the issue forms now apply what they declare. The
  gap they exposed is automated: `scripts/sync-labels.mjs` derives the labels from the forms
  themselves, because GitHub accepts a form naming a label nobody created and silently applies
  nothing. Every adopter would have hit that, and hit it invisibly.
- Branch protection, after `verify` has gone green once on `main`
- Windows: `harness-ship` is still POSIX-only and says so honestly, which may be the permanent answer

## Next — the second contributor does not collide with the first

**Done when:** two people can pick up work without asking each other what they are doing, and a
review tells a first-timer plainly which comments are blockers.
**Blocked on:** the labels above; the issue list only works as a coordination layer once issues can
be filed.

- The bank → issue → assignment protocol is written; nothing enforces or measures it yet
- `pr-coach` now classes changes by blast radius. Untested against a real contributor PR
- **Unmeasured, and it is the interesting one:** whether decomposition is the constraint. The stated
  test is *contributors idle while the bank is full* — nothing watches for that today

## Then — the local application becomes the way you see the project

**Done when:** the question *"what is happening in this repository"* is answered by opening a page,
not by running six commands and holding the answers in your head.
**Blocked on:** nothing — the data is all committed already, which is why this is the best place to
point a contributor.

Named because each is one view over data that exists: incidents over time (#37), a budget's history
from git, which gate fires most, a single file's story. The fleet — more than one repository at once
(#38) — is the one real design here, and it is the shared prerequisite nobody has drawn yet.

## Also — a release says what to do about it, not just what changed

**Done when:** a session that runs `harness-freshness`, finds itself behind, and reads the release
notes can perform the update without a human explaining anything — including knowing when it *must*
act rather than *may*.
**Blocked on:** nothing mechanical. It needs a decision about what a release is allowed to ask of an
adopter, which is Eric's, and that decision is the actual work.

**This is not reality today, and the gap is narrower than it looks.** Detection already exists:
[`plugins/harness-gates/lib/freshness.mjs`](../plugins/harness-gates/lib/freshness.mjs) answers *am I behind* on two
independent clocks — the checkout, and the SHA-tracked plugins that update on their own schedule.
What is missing is the other half. A release note currently reads:

    ### Features
    * import a real repository, to find out whether any of this travels (#61) (ce05e8f)

That is a commit subject. It says what changed and nothing about what the reader must DO — and the
reasoning that would answer it is written down, just not there: it lives in the commit body and the
pull request, and `release-notes-generator` takes only the subject line.

Three things it needs, in the order they get useful:

1. **A footer convention for actions**, the way `BREAKING CHANGE:` already works — a release that
   adds a budget file, moves a descriptor key, or requires re-running the bootstrap should say so in
   the commit that does it, because that is the only moment anyone knows.
2. **Those footers rendered into the notes** rather than dropped. This is `writerOpts` on
   [`.releaserc.json`](../.releaserc.json) and nothing more.
3. **Something machine-readable**, so a session compares what it has against what a release requires
   instead of parsing prose. The plugins carry no `version` field on purpose, so the identifier a
   session actually holds is a commit SHA — and the notes already print one.

The failure this defends against is specific: an adopter three versions behind, whose gates quietly
stopped measuring a dimension because a descriptor key was renamed, and whose green suite is
therefore a false green. Nothing today would tell them.

## Later — the harness is proven somewhere it did not grow

**Done when:** a repository nobody here works in has adopted it and kept it.
**Blocked on:** the cold-start defects being genuinely finished; five were found this week and the
count is not obviously converging.

The `README` calls portability a claim on purpose. Until an outside repository has run this and
stayed, it stays a claim — and the honest signal will be an adopter's *second* week, not their first.

---

## Shipped

- **The contributor model** — principals, zoning, standing, the drills, the worst-case catalog.
  *Evidence: `plugins/harness-core/docs/CONTRIBUTORS.md`, `plugins/harness-gates/lib/principals.mjs`, 345 tests.*
- **The cold start lands green** — five day-one defects, every one of them "red for something the
  adopter did not do". *Evidence: `tests/coldstart.test.mjs`, planted violations for each.*
- **Windows** — three defects and the launcher twins, all found by the first contributor to run it
  there. *Evidence: `scripts/sync-launchers.mjs`, 22 twins checked by `validate`.*
- **The local application** — `harness-serve`, and an overview that reported this repository has
  raised eleven budgets and lowered none. *Evidence: `plugins/harness-core/lib/overview.mjs`.*
