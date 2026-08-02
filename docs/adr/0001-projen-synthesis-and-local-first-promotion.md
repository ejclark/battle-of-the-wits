# ADR-0001: projen synthesis, and promotion as a background loop

- **Status:** Proposed
- **Date:** 2026-08-02

## Context

The harness ships three layers to a consuming repository, and **only one of them can be updated after
day one**:

| Layer | Travels how | Updates? |
|---|---|---|
| Procedure — agents, skills, doctrine, scanners | plugin marketplace, SHA-tracked | yes |
| Toolchain config — biome, commitlint, releaserc, npmrc, husky, CI | **copied** by `bootstrap.mjs` | **never** |
| Repo state — `harness.json`, budgets, exemptions | written once | correct as-is |

`put()` in `plugins/harness-core/lib/bootstrap.mjs` skips any file that already exists. That is right
for a file somebody customised and wrong for one that is merely old, and **the system cannot tell the
two apart** (idea #29). The drift lives entirely in the middle row, and its cause is that the row is
delivered *by copy*.

Two further facts force the shape of any fix.

**Plugin code cannot run in CI.** A plugin is copied to `~/.claude/plugins/cache/`, and its `bin/`
lands on the *Bash tool's* PATH — not the shell's. A consuming repository runs its gates through
`npm test` on a GitHub Actions runner, where no session and no plugin cache exist. So the scanners
must be an npm package regardless of anything else here.

**The boundary is crossed constantly.** Measured against `skynet-capital`: **44 of 132 commits over
six days — 33% — touch a surface the harness would manage.** Roughly seven per day.

### What was measured

A throwaway projen model of `skynet-capital` (27 scripts, 18 dependencies) on projen 0.101.23.

| Measurement | Result |
|---|---|
| skynet scripts lost in translation | **0 of 27** |
| skynet dependencies lost | **0 of 18** |
| escape hatches needed | **9**, against ~27 tasks and every dependency expressed natively |
| `package.json` diff after two passes | 3 cosmetic extras, inside an hour |
| second synth | **byte-identical** — synthesis is idempotent |
| `biome check src` direct | 456 ms |
| the same command through projen's task runner | 1043 ms — **+590 ms, constant** |
| the same command as a plain npm script | **263 ms** |
| synth, no dependency change | 546 ms (and it does not reinstall) |
| pull request open → merge, this repo | median 1.3 min |

Three mechanisms were demonstrated rather than assumed:

- `SampleFile` seeds a file once and **never clobbers it** — content added afterwards survives synth.
- Removing a local override once a component supplies the same value produces a **byte-identical**
  artifact, so a promotion can carry its own proof.
- `Component.postSynthesize` sees **final rendered state after every override** and can fail synth
  with a named reason and a non-zero exit.

One earlier claim was wrong and is corrected here: managed files are `chmod 444`, but `package.json`
is deliberately `644` and root bypasses the permission bit entirely. **Enforcement is regeneration
plus the anti-tamper check, not the permission.**

## Decision

**We will adopt projen as a file synthesizer, deliver everything over npm, and make promotion to the
harness a background loop rather than a step on the critical path.**

1. **npm is the only delivery channel.** The plugin marketplace is retired, because the gates must be
   an npm package for CI to reach them and a second channel for the same code is the drift we are
   removing.
2. **projen synthesises files; it does not run tasks.** Components emit plain npm scripts. The task
   runner costs +590 ms on every command — 2.3× on a fast lint — and `skynet-capital` uses task
   composition in 1 of 27 scripts.
3. **Local-first.** A change is made in the repository where the problem is. Promotion happens
   afterwards, off the critical path, and waits for the rule of three.
4. **Two file classes.** *Generated* files are rewritten every synth and their content belongs
   upstream. *Seeded* files (`IDEAS.md`, `LESSONS.md`, budgets) are written once, never clobbered, and
   their content belongs to the repository — the harness owns their **shape** and validates it, never
   their content.
5. **Config ratchets.** Overrides are tiered *Locked* (synth fails), *Ratcheted* (may be tightened,
   never loosened) or *Free*. Tier assignment is readable data, and the gate **grandfathers** — a
   repository with weaker config today has it frozen as a baseline, never turned into a red build.

## Alternatives considered

- **Keep copying, add provenance** (idea #29's checksum design) — would *detect* drift rather than
  prevent it, and leaves a full copy of every config in every repository. projen deletes the problem
  instead of measuring it.
- **Steal the mechanic, skip the framework** — a generated-file header, a chmod and an anti-tamper
  check is roughly fifty lines. Still the fallback if projen sours, and cheap because `eject` is a
  supported one-way exit. It lost on the component and override model, which we would otherwise
  rebuild badly.
- **Adopt projen's batteries** (`TypeScriptProject` ships jest, eslint, prettier) — would move
  consumers *off* biome and rstest, reversing the stated toolchain and trading one dependency for two.
- **Upstream-first promotion** — every shared change routed through a cross-repo pull request before
  it can be tested. At seven boundary-crossing commits a day, and with the debug loop broken across a
  repository and a registry, this is the cost that made local-first necessary.

## Consequences

**Easier.** One artifact, one version, reachable from a session and a CI runner alike. The
no-`version`-field doctrine and its gate disappear, along with `check-versions.mjs`,
`validate-manifests.mjs`, `sync-launchers.mjs` and 22 hand-maintained `.cmd` twins — npm generates
Windows shims. Config changes stop being a cross-repo round trip.

**Harder.** Adoption is a one-time flag day per repository: projen generates `package.json` rather
than reading it, so anything not expressed before the first synth disappears. The port is bounded and
diffable — measured at 9 escape hatches for skynet — but it scales with repository count, which argues
for doing it now rather than at six repositories.

**What we now live with.**

- **A breaking change for a live adopter.** It ships with `harness migrate` or it does not ship
  (idea #30). The migration mechanism becomes permanent, which also delivers the ROADMAP's *"a release
  says what to do about it"* phase.
- **Cross-repository detection needs the fleet** (ideas #37/#38), currently unbuilt. Until it exists,
  promotion detection falls back to a weaker single-repository heuristic.
- **Automated upstream pull requests need a scoped credential** — promoting the GitHub App from
  optional to prerequisite, with `workflows` never granted so idea #30's boundary is mechanical.
- **Dependabot moves upstream.** Eight of the 44 measured config commits are dependency bumps; once a
  component owns devDependencies, those bump in the harness and flow down.
- **The any-language claim retires.** An npm and projen spine is Node/TypeScript, and the README will
  say so. jsii is consequently unnecessary.
- **projen is itself 0.x**, and we take on its release cadence as a dependency of the build.
