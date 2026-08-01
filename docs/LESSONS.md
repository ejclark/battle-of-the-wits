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
