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
