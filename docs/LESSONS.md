# Lessons ledger

Every net that catches a slip is a *lesson we paid for*. This file is where that payment is banked,
so the same tuition is never paid twice. It is the output of the `/harness-core:retro` drill and is
enforced by `harness-incident-scan`.

**The rule: an incident is not closed until it has an entry here with a `PREVENTION` line.** A
prevention that only exists in a chat window protects nothing — the next session never reads it.
Prevention ranks, best first:

1. **A gate or a script** — the drift becomes impossible, or is caught mechanically. Free forever.
2. **A doctrine line** in `CLAUDE.md` — loaded into every session, so it steers the next decision.
3. **A ledger entry alone** — acceptable only when mechanizing costs more than the expected damage.
   Say so explicitly; don't default here because it's cheapest.

**Entry format** (parsed by the gate — keep the field names):

```
### <short title>
- **SHA:** <7-char sha or `n/a`>   **DATE:** YYYY-MM-DD   **STATUS:** closed | open
- **SIGNAL:** what first indicated something was wrong, and how long after the cause
- **ROOT CAUSE:** the actual mechanism, not the symptom
- **PREVENTION:** gate / script / doctrine / ledger-only (+ where it landed)
- **SIDE QUESTS:** threads pulled, or `none`
```

---

<!-- Entries go below, newest last. -->

### CI died in ten seconds because no lockfile was committed
- **SHA:** `9d8c6d4`   **DATE:** 2026-07-31   **STATUS:** closed
- **SIGNAL:** both CI jobs failed inside 10s at `setup-node`, on the very first pipeline run. Fast,
  but only because nothing had ever passed — a green history would have made this ambiguous.
- **ROOT CAUSE:** the workflow uses `npm ci`, which requires `package-lock.json`. The repository was
  scaffolded by hand and the lockfile was never generated, so the cache step had nothing to key on
  and the install refused. Nothing in the scaffolding step asserted that the file it depends on
  exists.
- **PREVENTION:** script — `harness-bootstrap` now generates and stages the lockfile as part of
  adoption rather than assuming a hand-built repo has one.
- **SIDE QUESTS:** the general shape here is "a workflow that depends on a file nobody generated",
  which is the same failure class as a `--frozen-lockfile` install in any ecosystem.

### `npm test` never ran the test suite, and it was verified by hand instead
- **SHA:** `96ee834`   **DATE:** 2026-07-31   **STATUS:** closed
- **SIGNAL:** noticed by reading the script, not by a failure — the suite had been "passing" for
  several PRs. Detection lag: several merges, which is the worst number in this ledger.
- **ROOT CAUSE:** two faults compounding. The script was `node --test tests/`, which resolves to
  MODULE_NOT_FOUND rather than a glob; and every verification run up to that point had used a
  hand-typed glob that *did* work. The equivalent command passing is not evidence that the project's
  own command passes — the difference between them is precisely where this class of bug lives.
- **PREVENTION:** doctrine — verify by running the project's own scripts, never a hand-typed
  equivalent, and check exit status rather than tailed output (a pipeline exits with `tail`'s
  status). Landed in `CLAUDE.md`; the script itself is now `node --test "tests/**/*.test.mjs"`.
- **SIDE QUESTS:** a gate could assert that `npm test` actually executes more than zero tests. Cheap,
  and it would have caught this on the first run.

### The shipped gate template targeted a runner the repo does not have
- **SHA:** `96ee834`   **DATE:** 2026-07-31   **STATUS:** closed
- **SIGNAL:** found while wiring the harness into its own repository — the template wrote a
  `.spec.ts` file using `describe/it/expect`, into a project whose runner discovers
  `tests/**/*.test.mjs` and provides none of those globals. The file would simply never have been
  collected: a gate that silently does not run, which is worse than a gate that fails.
- **ROOT CAUSE:** the template was lifted verbatim from the repository it grew in, carrying that
  repository's runner as an unstated assumption. A ported artifact keeps the accidents of its origin
  unless something forces them to be named.
- **PREVENTION:** script — the bootstrap detects the target's runner and writes the matching
  template (`gates.spec.ts` or `gates.test.mjs`) instead of one fixed flavour.
- **SIDE QUESTS:** the same class produced the hardcoded `.ts` extensions in the scanners, which
  measured 1 file of 10 in this `.mjs` repository. Porting reveals assumptions; nothing else does.

### The release could not push its own version bump
- **SHA:** `1b7a5cd`   **DATE:** 2026-07-31   **STATUS:** closed
- **SIGNAL:** the release job failed on `main` with GH013 immediately after the first merge that
  should have cut a version.
- **ROOT CAUSE:** `@semantic-release/git` commits the version bump and pushes it straight to `main`,
  which the branch ruleset requiring pull requests correctly refuses. Two safety mechanisms, each
  right on its own, whose composition is a deadlock.
- **PREVENTION:** ledger + doctrine — the git plugin was dropped and `version` removed from the
  plugin manifests, so the tag is the single source of truth and Claude Code falls back to the
  commit SHA. Recorded in `README.md` so the absent field reads as deliberate rather than missing.
- **SIDE QUESTS:** "two correct mechanisms that deadlock when composed" is the interesting shape. It
  showed up twice in one week — see the next entry.

### A required check on *every* branch deadlocks the repository
- **SHA:** `n/a`   **DATE:** 2026-07-31   **STATUS:** closed
- **SIGNAL:** immediate — no pull request could merge, including the one that would have made the
  required check pass.
- **ROOT CAUSE:** a ruleset requiring a status check was scoped to all refs rather than the default
  branch. A check required on the branch that must run it to become passable is circular. Ordering
  matters as much as the rule: a required check should only be enabled after it has passed once.
- **PREVENTION:** ledger-only, deliberately. The change lives in GitHub settings, not the repository,
  so no gate here can see it — and the credentialed step is the human's by design. Mechanizing this
  would cost more than the incident.
- **SIDE QUESTS:** the same "correct rule, wrong scope" shape as the release deadlock above.

### The preflight refusal was blind to the exact case it existed to stop
- **SHA:** `99b8cfb`   **DATE:** 2026-07-31   **STATUS:** closed
- **SIGNAL:** caught by writing a test that tried to *defeat* the gate rather than confirm it — a
  case creating `.github/workflows/evil.yml` sailed through. Zero lag, because the test was written
  adversarially on purpose.
- **ROOT CAUSE:** the change set was computed from `git diff` alone, which does not report a file
  that has never been added. So the gate saw an athlete *editing* a workflow file and missed one
  *creating* it — the more dangerous half, and the one an agent starting from nothing would hit
  first.
- **PREVENTION:** gate — `changedFiles` now unions committed, staged, unstaged, and untracked paths.
- **SIDE QUESTS:** a refusal is only worth what its adversarial test is worth. Confirming a gate says
  yes to good input tells you almost nothing about what it says no to.

### The doctrine gate caught its own author
- **SHA:** `a704013`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** the doctrine test failed on the same pull request that wrote the offending line.
  Detection lag: minutes.
- **ROOT CAUSE:** a skill in `harness-core` pointed at `${CLAUDE_PLUGIN_ROOT}/docs/DISPATCH.md`, but
  that document ships inside `harness-gates` — a cross-plugin path that resolves only in a checkout
  of this repository, never in an adopter's install. Writing the gate does not exempt you from it.
- **PREVENTION:** gate — already mechanized; the existing doctrine test caught it unaided. The
  reference was changed to a public URL.
- **SIDE QUESTS:** this is the healthiest entry in the ledger. It is what the whole system is for.

### The harness did not hold itself to the standard it sells
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** found by running `harness-dungeon --today`, which named three dimensions this
  repository could not see. The shipped gate template wires **six** gates into an adopter's suite;
  this repository ran **three**. Nothing had been failing, because nothing was looking.
- **ROOT CAUSE:** the three unwired gates each had a soft prerequisite — `knip` uninstalled, no
  ledger file, no frozen budget — and each degraded politely to a skip rather than a failure. Every
  individual choice was right; the sum was a quiet blind spot with no single owner. An unmeasured
  dimension is not a passing grade.
- **PREVENTION:** gate — all six gates now run in this repository's own suite, with budgets frozen at
  today's honest numbers.
- **SIDE QUESTS:** the spec-gap gate scored this repository 24 untested files of 24, while 81 tests
  drove those files end to end. It counted only `import` as evidence of exercise, which is close to a
  lie in a codebase whose deliverable is a set of commands. Fixed in the same change
  (`references.mjs`). A number that is wrong in the safe-looking direction is the expensive kind:
  it makes the honest reading of every other gate suspect.

### Ratcheting a budget deleted the reasoning behind it
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** noticed by reading the diff after a routine `harness-arch-scan --update` — the
  `_why_dupe_scan` note explaining a deliberate raise was simply gone. Nothing failed, and nothing
  would have; the only detector was a human reading a JSON diff.
- **ROOT CAUSE:** `--update` rebuilds the budget file from the measured file list, so any key that
  is not a measured file disappears. The prose was always the load-bearing half of a raise — the
  number alone cannot tell a future maintainer whether the raise is still earned — and the routine
  act of ratcheting destroyed it.
- **PREVENTION:** gate — `--update` now carries `_`-prefixed keys through, asserted by a test that
  ratchets a throwaway budget and checks the justification survives.
- **SIDE QUESTS:** the failure shape is "a lossy rewrite of a file that carries two kinds of
  content." Worth checking wherever else a tool regenerates something a human also writes into.

### The scanners were made portable; the configs they depend on were not
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** found by reading, immediately after the previous change — not by any failure. The
  scanners had been fixed weeks earlier to read every path from `harness.json`; the `knip.json` and
  `.jscpd.json` templates they depend on still hardcoded `src` and `.spec.ts`.
- **ROOT CAUSE:** two of the six gates delegate detection to a third-party tool, so their scope lives
  in a config file rather than in scanner code. Fixing "the scanners" felt complete because the
  scanners were the thing named. The dependency one layer down kept the original assumption, and an
  adopter with any other layout would have gotten detectors pointed at a directory that may not even
  exist — reporting a confident zero, which looks exactly like a clean repository.
- **PREVENTION:** script + gate — both configs are now RENDERED from the descriptor (`configs.mjs`)
  instead of copied, and a bootstrap test runs the one-shot in a `lib/`-and-`spec/` repo and asserts
  no emitted config contains the string `src/`.
- **SIDE QUESTS:** "fixed the thing that was named, not the thing that was wrong" is the general
  shape. Worth asking, after any portability fix: what does the fixed thing *read*, and was that
  fixed too?

### A duplication finding was argued away by a rationale nobody tested
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** none for months. The duplication gate reported the finding correctly the whole time —
  32 duplicated definitions, the largest block in the repository — and a comment in the gate's own
  source explained why it was fine.
- **ROOT CAUSE:** the explanation said nine standalone `PATH` executables "must not import across
  that boundary." There is no boundary: a `bin/` launcher runs `node lib/<x>.mjs`, and from there a
  sibling import is an ordinary relative specifier. `harness-claim` had been importing `registry.mjs`
  since the day it was written, in the same directory, which falsified the claim before it was made.
  The cost was not the copies themselves — it was that `spec-gap-scan` silently ignored the `exclude`
  key two of its siblings honoured, which is exactly the bug six copies of one preamble produces.
- **PREVENTION:** gate + doctrine — the preamble is now one module (`descriptor.mjs`), and the
  `IGNORE` comment records that its previous justification was false so a future maintainer cannot
  re-import it. Duplication debt 32 → 25, clones 10 → 4.
- **SIDE QUESTS:** a gate can be argued *out* of a finding as easily as into one, and the argument
  that wins is the one that sounds like architecture. A rationale nobody has tested is not a
  rationale — and this one was cheap to test.

### A green suite hid a crash in the command people run most
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** `harness-dupe-scan --update` died with a ReferenceError seconds after a 108-passing
  test run. Caught only because the consolidation happened to require running it by hand.
- **ROOT CAUSE:** a missing import on the write path. Every gate case invoked the REPORT path only,
  so nothing exercised `--update` — the command a person runs immediately after a cleanup, at the
  moment they most need the tool to work.
- **PREVENTION:** gate — six cases run each scanner's `--update` in a throwaway repo. A test suite
  that covers one of two code paths reports the coverage of a suite that covers both.
- **SIDE QUESTS:** worth a sweep for other "second mode" commands with no case at all — `--candidate`
  is the obvious next one, and it is what every athlete calls to pick its target.

### The athletes' first command would have killed them, and nothing knew
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** none available. Found by deliberately probing `--candidate` on all six gates after the
  previous retro flagged it as the one untested second mode. No athlete has ever been dispatched, so
  the surface had never been exercised even once.
- **ROOT CAUSE:** `--candidate` is the machine interface — the first command every athlete and the
  governor runs — and it was never specified, only implemented six times. `harness-incident-scan
  --candidate` printed a bare diagnostic line and no JSON at all whenever it had no token or no
  network (offline: always), and emitted a bare object rather than `{candidate}` when it did work.
  An athlete parses stdout and reads `.candidate`; it is a language model following an instruction
  file, not code with a try/catch. First command, SyntaxError, dead.
- **PREVENTION:** gate + doctrine — the contract (exit 0, exactly one JSON object on stdout, a
  `candidate` key that is an object or null, diagnostics to stderr) is written into `DISPATCH.md`
  and asserted for all six gates in two conditions: a repo with real debt and a bare repo that
  nothing can measure.
- **SIDE QUESTS:** the pattern across four retros in one night is identical — **a surface nothing
  exercises reports the confidence of one that is exercised.** Gates never wired, a config never
  scoped, a command never run, and now an interface never called. Worth asking of anything before
  its first real use: what has actually run this?

### Every instruction the harness shipped named a path the reader does not have
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** found by reading `harness-ship` — the athlete's LAST command — while auditing surfaces
  nothing had exercised. It invoked `node scripts/incident-scan.mjs` at runtime, told the caller to
  read `.claude/skills/ship/SKILL.md`, and printed a usage line for a file called `scripts/ship.sh`.
  None of the three exist in an install. Every scanner's fix-it message had the same defect, as did
  two athlete instruction files.
- **ROOT CAUSE:** the harness grew inside one repository and was lifted out; what it carried were
  that repo's paths, stated as if universal. The athletes had been repointed at `harness-*` commands
  weeks earlier — by an ENUMERATED sweep, so everything not on the list survived, and survived
  looking authoritative. An instruction that names a command the reader does not have is worse than
  no instruction: it reads as knowledge.
- **PREVENTION:** gate — a doctrine test scoped by CATEGORY rather than enumeration: no shipped file
  may contain `node scripts/*.mjs`, `scripts/ship.sh`, or a `.claude/skills/*` path. Verified by
  reintroducing an offence and watching it fail, because a gate nobody has seen refuse is a gate
  nobody knows works.
- **SIDE QUESTS:** the enumerated sweep is the interesting failure. It fixed everything it looked at
  and taught nothing, so the same bug regrew in the files it had not listed. Prefer a rule that names
  the *category* — the doctrine gate and this one both do, and both caught things their authors had
  not thought of.

### CI caught a typo that was already checkable locally
- **SHA:** `6fedd17`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** the `verify` job went red on a PR whose local suite was green. Round trip: a push, a
  runner, and a red PR — for a 200ms check that was already installed on the machine that made the
  mistake.
- **ROOT CAUSE:** a sweep rewrote a skill reference into backticks inside a double-quoted shell
  string, which is command substitution (SC2006). Shellcheck ran only in CI, so `npm test` could not
  see it. The deeper fault is the split: CI verified a dimension the project's own command did not.
- **PREVENTION:** gate — shellcheck now runs inside the test suite, so `npm test` covers what CI
  covers. It reports plainly when shellcheck is absent rather than passing silently; CI installs it,
  so the dimension is always measured somewhere.
- **SIDE QUESTS:** a verification step that exists only in CI turns a typo into a commit-push-wait
  cycle, and the wait is where people quietly stop verifying. Worth auditing the CI workflow for any
  other step the local command cannot reproduce.
### The shipped doctrine described a different repository
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** found while fixing stale command paths — `ENGINEERING.md` ships inside `harness-core`,
  and its "Automated enforcement" section named `.claude/hooks/skynet-tdd-postedit.sh` and edits
  "under `skynet-capital/`". Reading further: valuation math in `src/domain/portfolio.ts`, risk in
  `src/engine/guards.ts`, a `personas/` directory, an Alpaca adapter, a Redux decision about a
  dashboard that does not exist for anyone else, and three relative links to files no install has.
- **ROOT CAUSE:** the doc was written as the engineering standard OF one application and later
  promoted to portable doctrine by moving it, which changes where a file lives and nothing about
  what it claims. Every rule in it was stated through one project's nouns, so an adopter reads
  authoritative-sounding instructions about modules they do not have — and cannot tell which parts
  are the rule and which are that project's illustration of it.
- **PREVENTION:** gate — every relative link in a shipped doc must resolve inside the plugin that
  ships it (dead links were the mechanical half of the problem and are now impossible). The prose
  half was rewritten so each rule states the principle and any example is marked as an example.
- **SIDE QUESTS:** promotion-by-relocation is the general shape: moving an artifact into a portable
  home does not make it portable. Ask what the moved thing *claims*, not just where it now sits.

### The blast-radius gate measured against a branch that may not be current
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** `harness-preflight` refused a change for raising two budgets that had already been
  raised, in a reviewed PR, on `main`. The refusal was against a local `main` that had not been
  fetched since before that merge.
- **ROOT CAUSE:** `defaultBranch()` resolved `origin/HEAD`, stripped the `origin/` prefix, and used
  the result as BOTH the branch name and the comparison ref. The name and the ref are different
  questions — "am I on the default branch?" versus "what is this diff against?" — and answering the
  second with the first means comparing against whatever the local branch happens to be. An
  athlete's worktree is exactly where that is stale.
- **PREVENTION:** gate — the two are now separate values, the ref prefers `origin/<name>` when it
  resolves, and both helpers moved to `gitscope.mjs` where they are tested by import. Verified by a
  negative control: the new case fails against the old implementation.
- **SIDE QUESTS:** the failure is asymmetric and that is the part worth remembering. A stale base
  invents violations that are not there — noisy, self-correcting — and HIDES violations that are.
  A false clear from the gate that guards the irreversible class is the direction that costs.

### The parity gate passed by seeing almost nothing
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** a **negative control that failed to fail.** Removing the allow-list entry for
  shellcheck should have made the new gate refuse; it stayed green. Zero lag, because the control was
  run on purpose.
- **ROOT CAUSE:** the gate parsed the CI workflow for `run:` on a single line. A `run: |` block puts
  its commands on the FOLLOWING lines, and that is where shellcheck and the CLI validator live — so
  every multi-line step contributed nothing, and the gate passed by measuring almost nothing. It was
  written specifically to stop "a dimension nobody measures", and it was one.
- **PREVENTION:** gate — the parser now consumes block bodies by indentation, plus a self-check
  asserting it found the shellcheck step at all. A parser that finds nothing must fail loudly rather
  than report a clean sweep.
- **SIDE QUESTS:** a negative control is not ceremony. Both gates written tonight passed on first
  run; one of them was measuring nothing, and only the deliberate attempt to break it told them
  apart. **A gate nobody has seen refuse is a gate nobody knows works.**

### The duplication gate started reporting its own fix as debt
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** after the six copies of the descriptor preamble were consolidated into one module, the
  gate still reported 25 duplicated definitions — and 15 of them were the *consolidation*: six files
  each writing `const DESC = descriptor(ROOT)` and `const budget = readBudget(...)`.
- **ROOT CAUSE:** the signal is "the same top-level name declared in N files", a proxy for "the same
  implementation pasted N times". A local name bound to an imported symbol satisfies the proxy while
  being the exact opposite of the thing it proxies for — the implementation lives in one place, which
  is what DRY asks for. Left alone, the gate punishes the fix and rewards leaving the copies.
- **PREVENTION:** gate — `definitions.mjs` excludes a `const` whose initializer's only call is to a
  symbol imported into that same file. `function` and `class` are always definitions, because that is
  where pasted code actually lives. Debt 25 → 10, with twelve cases, most of them adversarial.
- **SIDE QUESTS:** the tempting alternative was renaming ~20 symbols across six files to satisfy the
  counter — the same "gate distorting the codebase" this repo banked once already, at four renames.
  When the counter and the code disagree at that scale, the counter is the thing to fix. The
  discipline is that the fix must be a claim about STRUCTURE, checkable from source, not another list
  of excused names: a list can be extended to excuse anything, and eventually is.

### A read-only tool wrote a document browsers open in quirks mode
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** none, ever. `harness-map` was the one shipped launcher no test referenced at all, found
  by auditing which commands anything had exercised. It ran fine and produced a file that opened.
- **ROOT CAUSE:** the renderer returns page CONTENT — `<title>`, `<style>`, then markup — which is
  the correct shape for an embedding host that supplies its own skeleton. Written to disk there is no
  host, so the file had no doctype and every browser opened it in **quirks mode**, where box-sizing
  and several inherited properties differ from the standards mode its CSS was written against. It
  rendered, which is exactly why nothing complained; it did not render as designed.
- **PREVENTION:** gate — `mapDocument()` emits the full skeleton, with six cases covering doctype,
  the required tags, standalone-ness (no external stylesheet, script, font, or image), HTML escaping
  of ADR titles, a repo with no ADRs, and the `-o` path. The output is also gitignored, in this repo
  and in the shipped template: a read surface must not dirty the tree an athlete then preflights.
- **SIDE QUESTS:** same family as the whole week — an artifact correct in the context it was authored
  for, moved to a context that needs more, with nothing in between to notice. "It opens" is not the
  same claim as "it is a document."

### A test fixture transcribed the template it was testing against
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** adding one line to the shipped `.gitignore` template turned a passing bootstrap case
  red. Zero lag, but the failure pointed at the wrong thing.
- **ROOT CAUSE:** the case hand-wrote a `.gitignore` matching the template's contents, so it asserted
  on the transcription rather than the behaviour ("a repo already covering the harness's needs is
  left alone"). A copied fixture is a second source of truth, and the copy goes stale silently in the
  direction that matters: it would also have kept passing while covering the wrong set.
- **PREVENTION:** gate — the fixture is now read from the shipped template, so it cannot drift.
- **SIDE QUESTS:** the enumeration-versus-category lesson applies to fixtures, not just to rules.

### The automated adoption committed to the branch it then told you to protect
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** the first end-to-end run of `harness-bootstrap --auto`, ever. Reading the code would
  not have surfaced it — the commit step looks unremarkable until you watch it land on `main` and
  then read the handover text it prints three lines later.
- **ROOT CAUSE:** `--auto` ran `git add -A && git commit` on whatever branch was checked out, which
  in a fresh adoption is the default branch. The handover it then prints instructs the adopter to
  enable a ruleset requiring pull requests — at which point the adoption commit is stranded where it
  can no longer be pushed. `harness-preflight`, installed by that same run, refuses exactly this.
- **PREVENTION:** script + gate — the run now creates `chore/adopt-the-harness` before committing
  (and leaves an adopter already on a feature branch where they are), with seven cases covering the
  branch, the grandfather step, the unlit dimension, no-push-without-asking, the handover text, and
  re-running safely. The handover also now says that preflight will refuse the adoption commit **by
  design**, because adoption is the one change that legitimately writes `.github/workflows/`.
- **SIDE QUESTS:** a tool that violates the doctrine it installs teaches the adopter that the
  doctrine is optional — and it teaches them that on day one, which is the only day they are paying
  full attention. Third instance this week of "two correct mechanisms that deadlock when composed",
  and the first where the harness composed the deadlock with itself.

### The most-executed artifact the harness ships was the least measured
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** none. Found by continuing the audit — the status line runs on every render in an
  adopter's editor and no test had ever executed it.
- **ROOT CAUSE:** it lives in `templates/`, which the gates deliberately exclude from measurement,
  because a template is not this project's code. That exclusion is right for the scanners and wrong
  as an excuse: "not measured" was being read as "fine". Running it surfaced two defects. Its depth
  indicator can only ever reach 3, because phases 4 and 5 are repository *settings* a file-reading
  row cannot see — so a fully adopted repo displayed `depth 3/5` forever and read as permanently
  unfinished. And `readFileSync(0)` on a TTY reads until EOF, which is a HANG rather than a throw:
  the one failure its careful try/catch could not save it from, and the one that freezes the row
  instead of hiding it.
- **PREVENTION:** gate — eight cases: no row where the harness is not adopted, persona selection and
  fallback, depth at each observable phase, the ceiling message, a malformed descriptor, and nothing
  on stderr. The ceiling now names the wall (`rest is repo settings`) instead of implying more code
  work, and stdin is only read when something is piped.
- **SIDE QUESTS:** an exclusion is a statement about *who measures*, never about whether something
  matters. Worth checking anything else excluded on principle — fixtures, generated output — for the
  same silent promotion from "out of scope" to "assumed fine".

### The git hooks the harness installs were never checked by anything
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** none, ever. Found by continuing the templates sweep the previous retro recommended.
  CI shellchecks `plugins/*/bin/*` — every launcher, and no hook.
- **ROOT CAUSE:** two faults. The glob was an ENUMERATION, so it covered exactly what its author had
  in mind and nothing else; and the hooks live in `templates/`, which every gate excludes. Running
  shellcheck on them found a real defect in `pre-commit`, which executes on every commit an adopter
  makes: it word-split a newline-joined list of staged paths, so a file named `release notes.md`
  became two arguments — formatting silently skipped it, and `git add` was handed two paths that do
  not exist. None of the three hooks carried a shebang either, so nothing could analyse them.
- **PREVENTION:** gate — `tests/shell.test.mjs` now covers every shipped shell script, launchers and
  hook templates alike, and asserts the hooks are in scope so the coverage cannot silently narrow
  again. Paths are NUL-delimited through `xargs -0`, with an end-to-end case that stages a filename
  containing a space; verified by a negative control against the old implementation.
- **SIDE QUESTS:** two enumerations failed in one week — the athletes' command paths and this glob.
  A glob is an enumeration wearing a wildcard. When the scope is "everything of kind X", derive the
  list and assert the derivation found the kinds you expect.

### A shipped template promised a hook the harness does not provide
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** none. Found by inventorying `templates/` after the last two retros pointed there.
  `common/claude/settings.json` was never read by any module, and it shipped a hooks entry running
  `.claude/hooks/intent-log.mjs` — a script this harness does not write. The `|| true` meant it would
  have failed silently in every adopter's editor, forever.
- **ROOT CAUSE:** `templates/` is excluded from every gate, correctly — a template is source-shaped
  but is not this project's code, and measuring it inflates every number. The exclusion is also why
  knip could not see a dead file there, and why nothing could see that a shipped config referenced a
  path that does not exist. The directory had no gates of its own, only an absence of them.
- **PREVENTION:** gate — three, all category-scoped: every template must be reachable from the
  bootstrap's own `tpl()` calls (derived from the loader, not a list); the two gate-spec templates
  must name the same gates; and no template may reference a `.claude/hooks/` path. Verified by
  restoring the dead file and watching two of them fail.
- **SIDE QUESTS:** second retro in a row where the finding was inside an exclusion. An exclusion
  moves responsibility, it does not remove it — whatever is out of scope for the general gates needs
  a specific one, or it needs to not ship.

### Two spec templates could drift, and the loser was chosen by toolchain
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** noticed while inventorying templates — `gates.spec.ts` and `gates.test.mjs` each list
  the six gates independently, and nothing compared them.
- **ROOT CAUSE:** the bootstrap picks between them by detecting the adopter's test runner. Add a
  seventh gate to one and not the other and half of all adopters silently lose that dimension — with
  the half selected by a property of their toolchain, which is the last thing anyone would think to
  check when a gate seems to be missing.
- **PREVENTION:** gate — the two templates must name the same gates, with a self-check that the
  parse found at least six so a broken parse fails loudly rather than agreeing that both are empty.
- **SIDE QUESTS:** the same shape as the earlier "shipped template targeted a runner the repo does
  not have" — a fork in the adoption path is a place where two things must stay equal, and equality
  that nothing asserts is a coincidence with a shelf life.

### The first adoption into a second repository failed four ways
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** the README has said all along that "portable" was a claim rather than a fact, proven in
  exactly one codebase. Adopting into a throwaway JavaScript project — `lib/`, `spec/`, `.js`, no
  TypeScript — produced four defects in under a minute, none of which any existing test could see.
- **ROOT CAUSE:** four separate assumptions, each invisible while there was only one adopter.
  (1) The scripts table hardcoded `typecheck: tsc -p tsconfig.json --noEmit` and a `verify` that ran
  it, so a JavaScript repo's first verify failed on a file it does not have, for a language it does
  not use, in a script the harness had just written. (2) The gate spec template used `assert.fail`
  outside a test callback and unsorted imports — flagged by the linter the harness itself installs,
  so the bootstrap wrote a file its own verify rejected. (3) Three written files failed that
  formatter. (4) Worst: the gate file was named `gates.test.mjs` in a repo whose suite globs
  `spec/**/*.test.js`, so it was never collected — the gates reported nothing while the suite stayed
  green. The runner decides which globals exist; the SUFFIX decides whether the file is seen, and one
  check was answering both questions.
- **PREVENTION:** script + gate — the scripts table is descriptor-aware (`scriptsFor`); both gate
  templates throw instead of asserting outside a case; `--auto` formats what it wrote and nothing
  else; and the gate file carries the repo's own `specSuffix`, with `.mjs` forced in a CommonJS
  package because a file that throws on import is at least loud. Cases for each, including the
  CommonJS conflict.
- **SIDE QUESTS:** the fix for one ordering trap walked straight into another — `gateSpecFor` re-read
  `harness.json` from disk, which by then was the DEFAULT the bootstrap had just written, so it named
  the file after an opinion the repo never expressed. Passing the descriptor in fixed it. Whenever a
  tool both writes a file and reads it, name which copy is authoritative.

### A repository rename broke the release, and nothing could see it
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** `semantic-release` failing on `main` — after the merge, where nothing is watching.
  Eric spotted it and named the cause before any gate did. Detection lag: several merges.
- **ROOT CAUSE:** the repository was renamed mid-session. GitHub redirects, so every push kept
  working and every local tool kept agreeing with a remote URL that no longer existed — which is why
  the rename was invisible rather than noisy. Meanwhile `package.json`'s repository URL, the
  marketplace name in the README's install command, both plugin manifests, and a dozen doc links all
  still named the old repo. **A rename is not a code change, so no diff contains it**, and every
  gate here reads diffs or committed files.
- **PREVENTION:** gate — `tests/identity.test.mjs` derives the repository's true slug from
  `GITHUB_REPOSITORY` (set by Actions to the CURRENT name; the git remote is the stale thing, not the
  witness) and asserts package.json, the marketplace name, the README install command, both plugin
  manifests, and every `github.com/<owner>/…` link agree. Locally, with no ground truth available and
  no network call permitted, it checks internal consistency and says so. Ledgers are exempt: an entry
  describing what happened under the old name is correct, and rewriting history to satisfy a gate is
  worse than the drift.
- **SIDE QUESTS:** I noticed the rename mid-session, from a CI URL, and filed it as a note in a PR
  body rather than stopping to ask. It was an identity change with predictable outward-facing
  fallout — squarely the class that is Eric's call and should have been raised the moment it was
  seen, not summarised later. **Noticing something that needs a human and deferring the telling is
  the same failure as not noticing.**

### The second view of the repository immediately duplicated the first
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** the duplication and clone gates went red in the very change that added `city.mjs` —
  the same change whose stated purpose was to stop two pictures of one repository disagreeing.
- **ROOT CAUSE:** the new view needed the ADR list, the HTML escaper, the `-o/--out` parse and the
  repo-name resolution, all of which already existed inside the first view's module. Copying was the
  path of least resistance and it takes ten seconds; the drift it causes takes months to notice,
  because two renderings that were correct on the day they were written stay *plausible* long after
  they stop agreeing.
- **PREVENTION:** gate — already mechanised, and it fired unaided. The fix was to build the thing the
  ladder was declared to need: `model.mjs` derives the repository once and `cartography.mjs` now
  consumes it instead of parsing ADRs a second time, with `render.mjs` holding the shared plumbing.
- **SIDE QUESTS:** worth stating as a rule for the rungs above this one — **views may share their
  plumbing and must never share their conclusions.** Escaping and argument parsing are plumbing;
  "what counts as a big file" is a conclusion, and a rung that decides that for itself has stopped
  being a view of the repository and become an opinion about it.

### The tool that answers "what should I build?" could only propose cleaning
- **SHA:** `n/a`   **DATE:** 2026-08-01   **STATUS:** closed
- **SIGNAL:** Eric asked what the next dungeon was. `harness-dungeon --today` answered with two
  low-urgency tidying campaigns, because every gate was green and tidying was the only thing it could
  see. A correct answer to a narrower question than the one asked.
- **ROOT CAUSE:** the forge reads budgets and unlit dimensions — both measures of DEBT. The command's
  own prompt is "what dungeons should I build today?", and it had no input capable of proposing a
  build. Meanwhile 45 banked ideas sat in `docs/IDEAS.md`, which nothing read. A backlog nothing
  reads is not a backlog, it is a diary.
- **PREVENTION:** script — `ideas.mjs` parses the log into a graph and offers The Drawing Board
  alongside the debt campaigns, with placement DERIVED (debt first when it exists, ideas first when
  everything is green). Two rules keep it honest: nothing is invented — a proposal is a human's idea
  quoted back — and the one derived signal, how many other ideas reference this one, is stated as a
  proxy for load-bearing rather than as a verdict.
- **SIDE QUESTS:** in-degree turned out to be a genuinely useful signal on the real log — the
  most-referenced idea was one neither of us would have named from memory. Worth watching whether it
  stays useful as the log grows, or degenerates into "whatever was written first has had longest to
  accumulate mentions", which is a bias the count cannot see.
