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

- [ ] `npm test` — portability suite green
- [ ] `npm run validate` — manifests valid
- [ ] `node scripts/sync-versions.mjs --check` — versions agree
- [ ] New or changed gate: has a **planted-violation** case (a test that only asserts exit 0 proves nothing)
- [ ] No project-specific values added to the harness (budgets, exemptions, layouts belong to the target repo)

</details>
