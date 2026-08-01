---
name: dedupe
description: >-
  Consolidate a duplicated helper/design-system symbol into one shared module and import it everywhere —
  one symbol per PR, behavior-preserving, verified green and ratcheted. Use when the duplication gate
  (scripts/dupe-scan.mjs) flags a symbol defined in multiple files, when the same helper or token block
  appears pasted across files, or when asked to "dedupe", "consolidate", or "promote to src/ui". The
  corrective drill the ui-librarian agent runs; also invokable as /dedupe.
---

# Dedupe — the consolidation drill

The *correction* half of the duplication Coach: the gate (`scripts/dupe-scan.mjs` + `dupe-budget.json`,
enforced by `tests/arch/dupe.spec.ts`) is the eye that says the same symbol lives in N files; this drill
collapses it to one. Every copy left pasted is a future drift bug — copies evolve apart silently.

## 1. Take the gate's target (don't guess)

```bash
node scripts/dupe-scan.mjs --candidate
```

Emits the most-copied symbol and every file defining it. Take `candidate`. One symbol per PR.

## 2. Judge before you move (the eye is high-recall, not proof)

Open every listed definition and compare. Three cases:

- **True copies** (identical or trivially divergent) → consolidate (step 3).
- **Merely similar** (common shape, different jobs) → apply the **rule of three**: abstract on the third
  occurrence, not the second. Two similar things may be coincidence; forcing an abstraction couples code
  that merely looks alike, and a wrong abstraction costs more than a duplicate. Note it and stop.
- **Divergent implementations** — the copies drifted and now behave differently. Decide the canonical
  behavior; if call sites genuinely need both behaviors, they're different functions — **rename** one to
  say what it does. Never silently pick a winner where behavior differs; note the divergence in the PR.
- **Same name, unrelated things** (a false positive) → add the name to `IGNORE` in
  `scripts/dupe-scan.mjs` with a one-line justification comment. That's a legitimate outcome.

## 3. Consolidate

1. **Choose the natural home:** design-system/render helpers → `src/ui/` (create it on first need — this
   is the component-library seed, audit S1); domain logic → its domain module. Never a `utils.ts` junk
   drawer — that's a new god file in the making.
2. **Move the best implementation** there (exported, name unchanged). Delete the other copies; import the
   shared one everywhere. **Behavior must not change** — this is consolidation, not a rewrite.
3. **Check blast radius:** `graphify affected <files>` — confirm only expected dependents move.

## 4. Verify green, by exit status

```bash
npm run typecheck && npm run lint && npm test && node scripts/dupe-scan.mjs
```

Never pipe a check to `tail` — it masks the exit status.

## 5. Ratchet the win in

```bash
node scripts/dupe-scan.mjs --update    # budget only ever lowers
```

Commit `dupe-budget.json` in the same PR so the consolidation is locked in.

## Rules

- **One symbol per PR.** Bounded diff, trivial review, safe revert.
- **Never change behavior in a dedupe PR.** Divergent copies get an explicit decision, documented in the
  PR — not a silent merge.
- **`authenticator.ts` caveat:** its inline login JS is a TS template literal — no backticks/`${}` inside
  it. Consolidating *server-side* helpers out of it is fine; anything feeding the inline string needs the
  re-inline discipline (`https://github.com/ejclark/battle-of-the-wits/blob/main/plugins/harness-core/docs/ENGINEERING.md`).
- **PR title = Conventional-Commit subject**, lowercase-led (`refactor: consolidate escapeHtml into src/ui`).
- **Report honestly.** Not all green → no PR; say what failed and stop.
