# The Operating Model — portable (lift & shift)

A **lift-and-shift of how this repo operates** — the working conventions, not the code. Skynet
Capital runs on a small "idea operating system": Eric injects thoughts freely, Claude routes each one,
ideas live in a durable backlog, Claude hunts side quests in proximity to real work, and everything
ships as small green PRs. This document lets you **copy that operating model into any other repo.**

Two ways to use it:

- **One paste (recommended).** Open a Claude session on the target repo and paste the
  [Activation prompt](#activation-prompt) below. Claude inspects the repo, fills in the
  stack-specific blanks, and writes a tailored `CLAUDE.md` + `docs/IDEAS.md`.
- **Manual.** Copy the two [Templates](#templates) into the target repo and fill the `<placeholders>`
  yourself.

The **process** here is domain-agnostic on purpose. But a scrubbed-agnostic process has a structural
gap: the branding/identity that makes output *lovable* is exactly what agnosticism removes. We close
that gap not by shipping a brand (that can't be portable) but by shipping a **method that discovers
and grows one** — the [Brand Cohesion Protocol](#brand-cohesion-protocol-bcp) below, whose output is a
domain-specific `BRAND.md` the agnostic process then rides on. So the full artifact is **agnostic
process + a repeatable way to produce domain-specific identity**.

---

## Activation prompt

> Copy everything in this block into a Claude session opened on the repo you want to transform.

```
Install this repo's "operating model" — how we work together, not the code. Do the following:

1. Inspect the repo to learn its stack: read the README, package manifest / build files, and any
   existing contributor docs. Derive the real VERIFY COMMANDS (typecheck, lint, test, build) and the
   commit/PR conventions actually used here. If a convention is unclear, ask me one question rather
   than guess.

2. Run the Brand Cohesion Protocol's SENSE + DISTILL steps to close the identity gap. Gather every
   identity signal: existing assets (palette, type, logo, copy voice), the domain's inherent character
   (what is this product ABOUT?), and my metaphors/references. If a structural map exists (e.g. a
   Graphify graph.json), use its god-nodes as identity-anchor candidates and its communities as
   cohesion scopes. Where identity signal is thin, ask me a few sharp questions rather than defaulting
   to generic. Then write BRAND.md (see the template) codifying tokens, voice & tone, core
   metaphors/motifs, 1-3 identity anchors, and the honesty/domain-accuracy rules. All later work is
   checked against BRAND.md.

3. Create CLAUDE.md at the repo root (or merge into an existing one) with these sections, adapted to
   this repo:
   - A one-paragraph "what this project is."
   - "Working with <me>" — a profile of how I think and my quality bar. Seed it with sensible
     defaults, mark it as mine to edit, and tell me it sharpens as I correct it. Ask me nothing yet;
     infer from the repo and our conversation, and I'll refine.
   - "Idea capture & routing (the adapter pattern)" — I inject ideas freely; you classify EVERY
     injected thought with a visible one-liner saying where it landed: act now / park (to
     docs/IDEAS.md) / profile note (update the profile) / question (answer, don't build). Optional
     prefixes I may use as overrides: NOW: / PARK: / ME: / Q:. No prefix required.
   - "Side quests — Claude generates ideas too" — while working, hunt for questions/clues in
     proximity to the current task; capture the worthy ones to docs/IDEAS.md without derailing, and
     surface each as a one-liner. Every idea records source + context: (src: <me> | Claude · while:
     <what we were doing>). Bias to quality over volume.
   - "Exquisite detail is a scalable process" — where an element has a rich backstory/lore, that
     licenses overly-refined detail; depth compounds with time invested; treat "make it more refined"
     as an open invitation.
   - "Ship loop" — the VERIFY COMMANDS you derived in step 1; branch off the default branch per
     change; small, focused, independently-shippable PRs; verify before merge (+ a screenshot/render
     for visual work); the repo's commit convention; and any repo-specific traps you noticed.

4. Create docs/IDEAS.md as the durable backlog: an Inbox (with an attribution legend — every idea
   tagged (src: … · while: …)), an "In progress", and a "Shipped" section. Seed the Inbox with any
   real TODOs / open threads you found while inspecting the repo, tagged as Claude-sourced side
   quests with their context.

5. Show me the three files (BRAND.md, CLAUDE.md, docs/IDEAS.md) for review before committing. Then
   ENFORCE + COMPOUND: check every deliverable against BRAND.md, extend it (never contradict it) as
   new elements appear, and flow refinements back into it. From now on, operate this way: route
   every idea I inject with a visible one-liner, hunt side quests as you work, and ship small green
   PRs.

Do not copy any Skynet-specific domain content — only the process. Keep it concise enough to scan,
detailed enough to execute.
```

---

## What gets installed (the operating model)

0. **Brand cohesion (`BRAND.md`).** The domain-specific identity the agnostic process rides on,
   produced by the [Brand Cohesion Protocol](#brand-cohesion-protocol-bcp) — tokens, voice, motifs,
   identity anchors, honesty rules. This is what keeps portable process from producing generic output.
1. **Idea OS — capture & routing.** The user externalizes ideas freely; Claude is the adapter that
   classifies each one (act now / park / profile note / question) and *states where it landed*, so the
   working context stays focused and nothing is lost. Optional `NOW:` / `PARK:` / `ME:` / `Q:`
   prefixes override the guess.
2. **A durable backlog** (`docs/IDEAS.md`). Ideas leave the context window into a committed file —
   critical when the working environment is ephemeral. The in-session task list is the working subset.
3. **Side quests.** Claude actively hunts adjacent questions/clues in proximity to real work and logs
   the worthy ones — every idea tagged with **source** (whose it is) and the **`while:` context**
   (the proximity that exposed it), so a revisit still carries the thread.
4. **The profile.** A "Working with <you>" section that teaches Claude your patterns so it reads terse
   notes generously. It's yours to edit and sharpens with each correction.
5. **Exquisite detail as process.** Backstory/lore licenses refined depth; "make it more refined" is
   an open, repeatable invitation, not a one-off.
6. **Ship loop.** Small, focused, independently-shippable PRs; branch off default; verify (typecheck +
   lint + test + a render for visual work) before merge on green; conventional commits.

---

## Brand Cohesion Protocol (BCP)

The method that closes the agnosticism gap. It is domain-agnostic in *form* but domain-specific in
*output*: you don't port a brand, you port a repeatable way to **discover and grow** one. Five moves:

1. **Sense** — gather every identity signal: existing assets (palette, type, logo, copy voice), the
   domain's inherent character (*what is this actually about?*), and the user's metaphors/references.
   Thin signal ⇒ elicit it with sharp questions, don't default to generic.
2. **Distill** — codify into a durable brand system (`BRAND.md`): tokens, voice & tone, core
   metaphors/motifs, lore hooks, honesty/accuracy rules.
3. **Anchor** — pick 1-3 **identity anchors**: elements with rich backstory that license exquisite
   detail and carry cohesion most vividly. Depth compounds here.
4. **Enforce** — every deliverable is checked against the brand system; new elements must *extend* it,
   never contradict it. Drift is a defect.
5. **Compound** — the brand system is living; refinements flow back into `BRAND.md` so identity
   deepens over time (this is the same principle as "exquisite detail is a scalable process").

Skynet Capital is a **worked example** of BCP output — see its
[`BRAND.md`](https://github.com/ejclark/skynet-capital/blob/main/docs/BRAND.md). The protocol was
run by instinct there; this section extracts the method so the next repo can run it deliberately.

### Handoff to a structural mapper (e.g. Graphify)

A code-knowledge-graph tool like [Graphify](https://github.com/Graphify-Labs/graphify) maps a repo's
*structure* — nodes/edges, **communities** (subsystems), **god-nodes** (highest-degree hubs) — but has
no identity layer. BCP is the complementary layer, and it *consumes* that map:

- **god-nodes → identity-anchor candidates** (Anchor). The most central elements are where cohesion
  should be most vivid.
- **communities → cohesion scopes** (Enforce). Consistency is checked per subsystem.
- **the graph → the Sense substrate.** Structure is one identity signal among assets + character +
  metaphors.

So the division is clean: the mapper answers *"what are the structural hubs?"*; BCP answers *"what is
the identity, which hubs carry it, and how do we keep it cohesive?"* — and the operating model applies
both. The concrete contract (what BCP reads from the map, the mapping rules, the flow) is specified in
[`BCP-GRAPHIFY.md`](https://github.com/ejclark/skynet-capital/blob/main/docs/BCP-GRAPHIFY.md).

---

## Templates

Fill every `<placeholder>`. These mirror the worked example's
[`BRAND.md`](https://github.com/ejclark/skynet-capital/blob/main/docs/BRAND.md), `CLAUDE.md`, and
`docs/IDEAS.md`.

### `BRAND.md` (template)

```markdown
# Brand & Identity System — <Project>

The durable record of what makes <Project> feel like itself. The operating model is agnostic; this is
the domain-specific counterpart it rides on. Every deliverable is checked against this; new elements
extend it, never contradict it. Living document — refinements flow back here (BCP step 5).

## Essence
<one paragraph: what this is, and the feeling it should evoke>

## Color / tokens
<palette + semantic tokens (name → value → role); light + dark if applicable; which color means what>

## Type
<the type stacks and their registers (display vs. data/label)>

## Voice & tone
<how it speaks; honesty/accuracy rules; register shifts by context>

## Core metaphors & motifs
<the recurring visual/narrative language new work draws from or extends>

## Identity anchors
<1-3 elements with rich backstory that license exquisite detail — where cohesion lives most vividly>

## Cohesion rules
<how new work stays on-brand: reuse tokens, honor accessibility, connect motifs, bake in detail where earned>
```

### `CLAUDE.md` (template)

```markdown
# <Project> — working notes for Claude

<One paragraph: what this project is and its north star.>

Engineering standards live in <link, if any>. This file is about **how we work together**.

## Working with <you>

<Your name> externalizes ideas as they occur — often mid-task, often as a metaphor. Read terse notes
generously against these patterns:

- <quality bar — e.g. "anything short of lovable is inadequate">
- <how you think — metaphors? systems? visuals?>
- <momentum vs. deliberation preference>
- <boundaries: what Claude must never self-authorize (credentials, spend, outward-facing actions)>
- <domain values — accuracy, honesty, tone>

_This section is <your> to edit; it sharpens as you correct it._

## Idea capture & routing (the adapter pattern)

For **every** injected thought, respond with a visible one-liner saying where it landed:
- **Act now** → do it this session.
- **Park** → append to `docs/IDEAS.md` + add a task; ack in one line, don't derail current work.
- **Profile note** → update "Working with <you>".
- **Question** → answer; don't build.

Optional overrides: `NOW:` act · `PARK:` capture only · `ME:` profile note · `Q:` answer, don't build.
No prefix required — absent one, Claude classifies and states the routing.

### Side quests — Claude generates ideas too

While working, hunt for questions/clues in proximity to the current problem; capture the worthy ones
to `docs/IDEAS.md` without derailing, and surface each as a one-liner. Every idea records source +
context: `(src: <you> | Claude · while: <what we were doing>)`. Quality over volume.

## Exquisite detail is a scalable process

Where an element has a rich backstory/lore, that licenses overly-refined detail — bake it in. Depth
compounds with time invested; treat "make it more refined" as an open invitation.

## Ship loop

- Branch off `<default-branch>` per change; small focused PRs; merge on green.
- Verify before merge: `<verify commands>`, plus a screenshot/render for visual work.
- <repo-specific traps>. Commit convention: <convention>.
```

### `docs/IDEAS.md` (template)

```markdown
# Ideas & Backlog

Durable home for ideas so they leave the working context but never get lost. <You> injects thoughts;
Claude routes each here (see `CLAUDE.md`). The in-session task list is the working subset; this file
is the permanent record.

**Attribution:** every idea records source + proximity — `(src: <you> | Claude · while: <context>)`.
<You>-sourced entries are intent; Claude-sourced ones are proposals to prune.

## Inbox (captured, not yet started)
- <idea> — <one line>. _(src: … · while: …)_

### Side quests (surfaced by Claude while working — proposals to prune)
- <idea> — <one line>. _(src: Claude · while: …)_

## In progress
_(nothing yet)_

## Shipped (recent)
- <thing> — PR #<n>
```

---

_This operating model is itself a living artifact — improvements to how we work here should flow back
into this document so the next lift-and-shift starts from the better version._
