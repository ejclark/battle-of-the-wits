---
name: ears
description: >-
  Turn a raw feature request, idea, bug, or acceptance criterion into EARS-format requirements
  (Easy Approach to Requirements Syntax) and scaffold the matching BDD specs. Use when writing
  acceptance criteria for a plan/issue/PR, when a requirement reads vague ("should support…"),
  or before writing a spec — EARS is the upstream half of our BDD loop (docs/ENGINEERING.md).
---

# /ears — write requirements the way we test them

EARS forces a requirement into a shape that is **verifiable and singular**, which is exactly the
shape a BDD spec needs. Reach for the simplest pattern that fits.

## The five patterns

| Pattern | Template | When |
|---|---|---|
| **Ubiquitous** | `The <system> shall <response>.` | always active, no trigger |
| **Event-driven** | `WHEN <trigger>, the <system> shall <response>.` | a discrete trigger |
| **State-driven** | `WHILE <state>, the <system> shall <response>.` | continuous during a state |
| **Unwanted behavior** | `IF <condition>, THEN the <system> shall <response>.` | error / guard / abuse path |
| **Optional feature** | `WHERE <feature is present>, the <system> shall <response>.` | behind a flag/config |
| **Complex** | combine, e.g. `WHILE <state>, WHEN <trigger>, the <system> shall <response>.` | nested conditions |

## Rules (what makes an EARS line valid)

1. **One requirement per line.** Two `shall`s ⇒ split into two.
2. **Name the system** — the concrete component (`the persona`, `the /pulse route`, `ship.sh`), not "the app".
3. **Response must be verifiable** — a spec has to be able to assert it. If you can't, rewrite it (kill "should", "support", "handle", "properly").
4. **Trigger/state/condition is testable** — a builder can construct it.

## Procedure

1. **Classify.** For each behavior in the request, pick the pattern from its cue: a trigger → WHEN;
   a sustained state → WHILE; an error/guard/abuse path → IF/THEN; behind a flag → WHERE; else
   Ubiquitous. Don't force a trigger onto an always-true rule.
2. **Write the EARS line(s).** Named system + `shall` + single response. Cover the happy path AND
   the unwanted-behavior (IF/THEN) paths — the error cases are where EARS earns its keep.
3. **Map to specs (mechanical).** Each EARS line → one spec: the `WHEN/WHILE/IF/WHERE` clause →
   `describe("when …")`, the `shall <response>` → `it("<response>")`. Scaffold them per
   docs/ENGINEERING.md (observable behavior only; `tests/support/builders.ts` for data).
4. **Hand off.** The EARS lines are the acceptance criteria (drop them in the plan/issue/PR); the
   scaffolded specs are the failing tests TDD then makes pass. The spec-gap coach ensures they land.

## Example

Request: "the feedback form should be rate-limited and only work for signed-in users."

- `WHERE the feedback token is configured, the feedback route shall accept submissions.` (optional)
- `IF the request has no valid session, THEN the feedback route shall reject it as unauthorized.` (unwanted)
- `IF an email has submitted 5 times in 10 minutes, THEN the feedback route shall reject further submissions with a friendly retry message.` (unwanted)
- `WHEN a valid submission arrives, the feedback route shall create a labeled GitHub issue and return its URL.` (event)

Four lines → four `describe/it` specs. Vague "should be rate-limited" became two verifiable IF/THEN
guards with concrete thresholds.

## Scope note

EARS is for **functional/behavioral** requirements. Visual/taste ("make it lovable") and pure
aesthetic polish stay screenshot-verified — don't force `shall` onto a vibe.
