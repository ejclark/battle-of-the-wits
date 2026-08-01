# Summary

<!-- Plain language, one or two sentences. What changes for someone using the harness? -->

# Why

<!-- The problem this solves. If it fixes a defect the portability suite caught, say which. -->

---

<details>
<summary>Details</summary>

## What changed

<!-- The weeds. Files, mechanisms, trade-offs. -->

## Verification

**If this changes only prose — docs, the idea log, a comment — you are done. Tick the first box and
stop.** CI runs the full suite on every pull request regardless, so nothing is being skipped; you are
just not being asked to certify something you have no way to check. Nobody has ever been expected to
install a toolchain to fix a sentence.

- [ ] **Prose only** — no source, specs, or budgets touched
- [ ] `npm run verify` green locally — validate + version check + the full suite, including the gates
- [ ] Behaviour change has a spec that fails without it
- [ ] New or changed gate: has a **planted-violation** case (a test that only asserts exit 0 proves nothing)
- [ ] A red gate was fixed at the finding, not by raising its budget
- [ ] No project-specific values added to the harness (budgets, exemptions, layouts belong to the target repo)

</details>
