# Architecture Decision Records

An **ADR** captures one significant architectural decision: the context that forced it, the choice
made, the alternatives rejected, and the consequences accepted. They give the project a durable
memory, so a decision made months ago can be understood — and revisited — without reconstructing it
from pull requests and chat logs.

`docs/JOURNAL.md` already points here: *"Git journals the code. `docs/adr/` journals the decisions.
`docs/LESSONS.md` journals the failures."* This directory is that third store, and until now it was a
reference to somewhere that did not exist.

## When to write one

Write an ADR when a decision is expensive to reverse or shapes how future work is built: a new
external dependency, a delivery mechanism, a distribution boundary, a security boundary, the
pipeline. Skip it for routine changes — a bug fix, a new fixture, a refactor that keeps the same
contract.

**Prefer evidence to argument.** This repository's whole claim is that it refuses to measure
dishonestly; an ADR that rests on an estimate should say it is resting on an estimate.

## How

1. Copy `0000-template.md` to `NNNN-short-title.md` (next number, kebab-case title).
2. Fill it in. Keep it short — one screen is ideal.
3. Set **Status** to `Proposed` in the pull request; flip to `Accepted` when it merges. A later
   decision that overturns this one sets this record to `Superseded by ADR-XXXX` — records are
   append-only history, so edit the status, never the reasoning.
4. Add a row to the log below.

## Log

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-projen-synthesis-and-local-first-promotion.md) | projen synthesis, and promotion as a background loop | Proposed |
