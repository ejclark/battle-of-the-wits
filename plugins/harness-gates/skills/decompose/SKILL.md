---
name: decompose
description: >-
  Split a god file into smaller, cohesive modules — one safe, behavior-preserving move per PR, verified
  green and ratcheted. Use when the architecture fitness gate (scripts/arch-scan.mjs) flags a large or
  low-cohesion file, when a file feels like it's doing too many jobs, or when asked to "decompose",
  "break up", or "extract from" a module. The corrective drill the decomposer agent runs; also invokable
  interactively as /decompose.
---

# Decompose — the split drill

The *correction* half of the god-file Coach: the fitness gate (`scripts/arch-scan.mjs` + `arch-budget.json`,
enforced by `tests/arch/budget.spec.ts`) is the eye that says a file won't scale; this is the drill that
fixes it. One split per PR — that discipline is the whole value.

## 1. Take the gate's target (don't guess)

```bash
node scripts/arch-scan.mjs --candidate
```

Emits the highest-leverage target as JSON, scored by size-over-budget **×** a cohesion penalty for many
exports — so a smaller file doing many jobs outranks a bigger cohesive one. Take `candidate`.

## 2. Split along a seam

1. **Read for a seam, not a line count.** Find a cohesive cluster that shares a responsibility and could
   be imported as a unit — the `escapeHtml`/`chip`/`tile` render helpers; one route handler; one shader;
   the payoff math. Split along the seam, never mid-idea.
2. **Split toward the atomic grammar** (`https://github.com/ejclark/battle-of-the-wits/blob/main/plugins/harness-core/docs/COACHES.md`): **atoms** (one job, no siblings' knowledge) →
   **molecules** (a few atoms, one purpose: a card, the Eye) → **organisms** (a view, a scene). Atoms are
   the floor — go sub-atomic only when a concrete need calls (a second consumer wants half the atom),
   never speculatively. Over-splitting is the mirror slop: complexity moved into the wiring.
3. **Extract to a new module** in its natural home (`src/ui/`, `src/scene/lego/`, `src/observatory/`…) —
   **named for the job it does, never `utils`/`helpers`** (the junk-drawer smell; arch-scan blocks it).
   Export the cluster; import it back. **This is a move + re-import, not a rewrite** — names stay identical
   so call sites don't churn, and behavior must not change.
3. **Check blast radius** before trusting it: `graphify affected <file>` — confirm only expected dependents
   move (see `docs/GRAPHIFY.md`).

## 3. Verify green, by exit status

```bash
npm run typecheck && npm run lint && npm test && node scripts/arch-scan.mjs
```

Never pipe a check to `tail` — a pipeline exits with `tail`'s status and masks failures.

## 4. Ratchet the win in

```bash
node scripts/arch-scan.mjs --update    # budgets only ever lower
```

Commit the updated `arch-budget.json` in the same PR so the limit permanently tightens.

## 5. Recurse if needed — but not now

If the new module is *itself* still a god file, it's the **next** PR's target, not a bigger split now.
Small green PRs over one heroic cut.

## Rules

- **One split per PR.** Bounded blast radius, trivial review, safe revert.
- **Never change behavior in a decompose PR.** No bug fixes or features riding along — a pure move keeps
  the diff reviewable and the revert safe.
- **`authenticator.ts` caveat:** its inline login JS is a TS template literal — no backticks/`${}` inside
  it. Extracting there means real `.ts` modules + a re-inline build step (`https://github.com/ejclark/battle-of-the-wits/blob/main/plugins/harness-core/docs/ENGINEERING.md`), not
  string juggling.
- **PR title = Conventional-Commit subject**, lowercase-led (`refactor: extract … from …`); the squash
  title + description become `main`'s record.
- **Report honestly.** If typecheck/lint/test/scan aren't all green, don't open the PR — say what failed
  and stop. A red decompose PR is worse than none.
