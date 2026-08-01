# Contributing

Welcome. This page is for **you, the person** — not for the tooling. It assumes you have never used
git, and that is fine: a great deal of real work here is done entirely in the browser, permanently, by
people who never install anything.

Everything below happens on github.com. If a step here seems to need a terminal, the step is wrong —
say so, and that report is itself a contribution.

---

## Before anything else: three things that cannot be undone

Everything else on this page is reversible. These three are not, so they come first.

1. **Turn on two-factor authentication.** *Settings → Password and authentication.* An account that
   can change code is worth stealing, and a password alone does not stop that. Use an authenticator
   app or a passkey rather than SMS. **Save the recovery codes somewhere real before moving on** —
   losing 2FA without them means losing the account outright, and it is the most common way someone
   gets permanently locked out. Not in this repository, not in a chat, and not in a note that syncs
   to the account you are protecting.

2. **Turn on email privacy — before your first commit.** *Settings → Emails → Keep my email address
   private.* Every commit permanently records whatever address git is configured with, into a history
   that is public, forked and mirrored. No revert un-publishes it. GitHub supplies a
   `users.noreply.github.com` address instead, which works everywhere. This protects future commits
   and cannot retract past ones, so the ordering is the whole point.

3. **Never paste a secret anywhere.** A secret is a long random-looking string a machine accepts *as
   an identity* — `ghp_…`, `sk-…`, anything sitting next to the words key, token, secret or password.
   Not in a pull request, an issue, a comment, or a screenshot.

   **If you think you leaked one, say so immediately, and know that deleting it does not fix it.** A
   deleted comment was already delivered to everyone watching; a deleted commit is still in the
   history. The only remedy is *rotation* — replacing the secret so the leaked one stops working —
   and only the repository owner can do that. Telling someone in the first minute is the entire fix.
   **Nobody is ever in trouble for reporting one.** The instinct to quietly delete and hope is
   universal, and it is what turns a two-minute fix into a real incident.

One more, because collaborators on a public repository are a known, targeted group: **email asking you
to sign in to GitHub is probably fake.** Navigate to github.com yourself rather than following a link.

---

## You are the first person through here, and it is not finished

Said plainly and up front, because it changes what everything else means.

**This on-ramp is new. You will hit things that are broken, wrong, or missing** — a step that does not
match your screen, a link that goes nowhere, an error nobody anticipated. That is not you going wrong,
and it is not a rough edge we are hoping you will politely ignore. **It is the thing you are here to
find.** Nobody who already knows how this works can find it, and the list above got written by exactly
those people.

The difference between a bug that costs you an afternoon and a bug that costs you nothing is entirely
whether you knew to expect it. Now you do.

### Nothing here is a dead end

The one rule that makes the rest safe: **you should never be stuck with nowhere to go.** If you are,
that is the most serious defect on this page and it outranks whatever you were originally doing.

The ladder, in order, and any rung is a fine place to stop:

1. **Try the obvious thing once.** Reload, re-read, click the other button. Costs a minute.
2. **After about fifteen minutes, stop.** In a project with this much written down, being stuck for
   an hour is a defect in the writing — pushing through it destroys the evidence and teaches you the
   wrong lesson about your own competence.
3. **Open an issue.** *"Something confused me"* — three questions, two minutes, no git, nothing that
   can go red. Say what you saw and what you expected. **You do not need to know what went wrong**,
   and guessing is not required or especially helpful.
4. **Then go do something else here.** Another file, another snag, the next thing that looks
   interesting. A blocked task is not a blocked session, and moving on is the correct response, not
   giving up.
5. **If steps 1–4 somehow do not apply, message Eric.** There is no situation where you are expected
   to sit and work it out alone.

**Getting stuck and stopping is a completed contribution.** The report is the deliverable — the fix
was never your job.

## The three words you will meet in the first five minutes

Short *and* accurate. A simplified version would only have to be un-learned later.

- **A branch** is a complete copy of the project where you can change things without affecting the
  version everyone else uses. Making one costs nothing and breaks nothing.
- **A pull request** is how you propose that your branch's changes join the real version. It is a
  *proposal with a conversation attached* — not a submission, and not a request for permission.
  Opening one is how everyone here changes anything, including the owner.
- **Merging** is when a proposal is accepted and becomes part of the real version.

And the sentence that removes most of the worry in the room:

> **Nothing you do on a branch can break anything.** The real version is untouched until a pull
> request is merged, and even then a merge can be undone in about ten seconds. This whole system is
> built so that being wrong is cheap — that is what all the automated checks are for.

---

## Making a change, in the browser

1. Open the file on github.com and click the **pencil** icon.
2. Make the edit.
3. At the bottom, choose **"Create a new branch for this commit and start a pull request."** Accept
   the branch name it suggests.
4. Give it a title. This project uses a convention that a machine checks, and the only rules that
   matter are: **start with a lowercase word**, and use one of these prefixes —
   `docs:` for prose, `fix:` for a defect, `feat:` for something new. So:
   `docs: explain what the second step needs`.
   If the title check goes red, it is telling you about the *format*, never about the content.
   **The box above it — the commit message, which GitHub pre-fills with something like
   "Update README.md" — is not checked and you can leave it exactly as it is.** Only the pull
   request title has to follow the convention, because that is the text that becomes permanent.
5. **Create pull request**, then fill in the template. If your change is prose only, tick the
   prose-only box and stop — the rest of that checklist is for changes that touch code, and CI runs
   the full suite either way.

Then the automated checks run. Watching them appear against your own change is the moment this stops
being abstract. **If one goes red, that is information, not a verdict** — read it with someone the
first few times, and fix it in the same pull request.

---

## What you can change right now

Your account is enough for all of these. Nothing here requires anyone to grant you anything first.

| | Where | Costs |
|---|---|---|
| **Report anything at all** — confusing, broken, missing | the **Issues** tab | one text box |
| Anything you found confusing on this page | this file | a pull request |
| A sentence in the README or any doc | `README.md`, `docs/` | a pull request |

**Start with an issue when in doubt.** It is the cheapest thing you can do here and it needs no git
at all — no branch, no checks, nothing that can go red. A report costs you two minutes and is worth
more to us than most changes.

If a change of yours is merged and you would like more room later, that is a conversation with the
owner — it is never automatic, and it is never a score.

---

## Finding a rhythm — the loop

The hardest question when you are new is not *how do I change a file*. It is **what should I even
work on?** Here is the answer, and it never runs out:

> **Read something → hit a snag → fix it or log it → ship it → read the next thing.**

That is the whole loop. What makes it work is that **step two supplies itself.** You do not need a
queue, a ticket, or permission — reading anything in this project at your current level of knowledge
*produces* work, automatically, because every place you have to stop and re-read is a real defect in
the writing. Nobody who already understands it can find those. You can only find them once.

**Step three has two exits and both are correct:**

- **It is prose** — a confusing sentence, a missing definition, a dead link, a step that assumes
  something it never said. **Fix it.** That is inside what you can change.
- **It is not prose** — it is code, or a rule you disagree with, or something you cannot judge.
  **Open an issue.** Not a pull request: an issue is one text box, no branch, no checks, nothing to
  get right. Use the *"Something confused me"* form — it asks three questions and takes two minutes.
  Then move on.

Logging is not the consolation prize. An observation nobody had is worth more than a typo fixed, and
moving on is what keeps the loop turning. **Getting stuck on something you cannot fix is the only way
to actually fail at this.**

### The loop should get faster, and you will feel it

Your first pass will take most of an hour, and almost all of it is mechanics — where the pencil icon
is, what the title format wants, waiting on checks. That is not you being slow, it is the fixed cost
of doing anything the first time.

By the fifth pass the mechanics disappear and the loop is ten minutes: notice, edit, propose, done.
**That drop is the whole point of the first week**, and it is worth watching for, because it is the
moment the tool stops being in the way and the work becomes the work.

If a loop is *not* getting shorter, something is wrong with the system and not with you. Say so —
that is the most valuable report on this page.

---

## Three things that genuinely need doing right now

Real, checked against the repository today, and sized for a first pass. Take any of them, or ignore
all three and follow your own snag — the loop is better than the list.

**1 · There is no glossary, and the words are everywhere.** *(best first task)*
**gate** appears over 300 times across the docs a newcomer reads, **athlete** over 70, **preflight**
and **ratchet** over 30 each — and not one of them is defined anywhere a newcomer would look.
Create `docs/GLOSSARY.md` and define the ones **you** had to guess at, in the words you would have
wanted. Leave out the ones you already understood.

You are the right person for this and it is not a beginner's consolation task — **it has to be
written by someone who did not know the words**, and everyone else here lost that ability months ago.
Ten terms is a complete first version.

**2 · A document nobody can reach.** `docs/README.md` is the index of where all the doctrine lives,
and **nothing links to it** — not this page, not the README, not any doc in the folder it indexes.
Add a line pointing at it from wherever *you* would have expected to find it — and if the answer is
"I would not have looked for an index at all", that is worth saying instead.

**3 · The README still has walls.** Five of its paragraphs run past 300 characters, the longest 383.
Break up the ones that made you slow down — and only those, because a paragraph you read easily is
fine as it is and shortening it costs clarity for nothing.

Each of these three is pinned by `tests/onramp.test.mjs`, which fails the moment one is *done*. That
is deliberate: the task list you are reading went stale once already, and sent someone at work that
was finished. Now the suite catches it before you do.

## Optional, and entirely yours: a GitHub profile

GitHub reserves one repository per account for this — a public repo named **exactly your username**,
whose `README.md` renders at the top of your profile page. It is a good thing to have, it belongs to
you rather than to this project, and it outlives anything you do here.

It also happens to be the **safest possible way to learn git**: it is your repository, so nothing you
do to it can affect anyone else's work, and you will practise every mechanic you need next — create,
edit, commit — somewhere nothing can break.

Entirely optional, and nobody is keeping track. If you want a hand, ask and someone will walk through
it with you — you write it, they do the fiddly parts.

---

## The thing you can do that nobody else here can

This is the part worth reading twice.

**You can notice when something is confusing. The people who built it cannot.** They know too much to
be confused by their own system — expertise destroys the instrument that measures confusion. The
person who wrote an error message is the last person able to tell you it is unreadable.

So when you get stuck, **the sticking point is the contribution.** Not a gap in you, and not something
to push through quietly and forget. It is a defect report about the system, and it is the one kind of
report nobody already here is able to file.

Two things make it much more useful, and both are easy:

- **Say what you saw, and what you expected** — *"I clicked it twice because nothing happened"* rather
  than *"there should be a spinner."* What you saw survives being wrong about the cause; a suggested
  fix is one of five possible answers, picked before anyone checked the others. Both are welcome, but
  the first is the valuable half.
- **Say it while it is still fresh.** This vantage point lasts about a week. Once the system stops
  being confusing you will never be able to see it that way again, and neither will anyone else.

**Fifteen minutes stuck is the right moment to ask.** In a project with this much written down, being
stuck for an hour is a defect in the writing — and reporting it is worth more than the change you
came here to make.

---

## Ask anything, and what can get built without waiting

**Ask your Claude session about this project directly.** The doctrine, the reasoning, the incidents
and the arguments behind most decisions are committed here, so a question like *"why do budgets only
go down?"* or *"what happens if a gate can't measure something?"* has a real answer in the repository
rather than a guess. If it does not, **that gap is a finding** and worth reporting.

### The honest bit about influence

**Right now your influence over direction is limited**, and you should know that rather than discover
it. Not because of anything to do with you — the collaboration model for this project genuinely does
not exist yet, and inventing one around a single contributor would be inventing it wrong. It will get
built, and being here early is how you end up shaping it.

**Limited influence is not the same as limited usefulness**, and the difference is most of what
matters day to day. A great deal can be built without anyone waiting on Eric, because the reasoning
is already written down and the work is reversible. That is where to aim.

### What can be built right now, without asking anyone

Where the context is established and the change is reversible, **your session can just build it.**
The rails catch mistakes and a squash-merge undoes them, so the expensive part of being wrong has
already been paid for.

**The local application is the best place to aim**, and it is deliberate advice rather than a
consolation. Run `harness-serve` and open it. Everything it shows is derived from data already in the
repository — gates, budgets, the run ledger, the structural model — so a new view is *reading*
something that exists, never inventing a source. It is new, so there is no legacy to break; it is
read-only, so nothing it does is dangerous; and it is visual, so you see whether it worked
immediately.

Things there that are genuinely missing, and each is one view:

- **Incidents over time.** `docs/LESSONS.md` records every failure with its prevention. Nothing shows
  them as a sequence.
- ~~**What a budget looked like a month ago.**~~ Built — `/history` in `harness-serve`. Left here on
  purpose as a worked example of the shape: one view, over data that was already committed.
- **Which gate fires most.** The run ledger has the records; no view counts them.
- **A file's story.** Pick any source file: its budget, its history, what `_why_` says about it.

Pick one. Build it. If it works, open a pull request.

## Labels, and why a script exists for two of them

The issue forms apply `snag` and `idea`. A repository's labels live in its settings, and **nothing in
a git clone carries them** — so an adopter gets the forms and not the labels, and GitHub does not
complain. It accepts the form, files the issue, and applies nothing. Nothing is red; the label is
simply never there, and anything built on top of it reads an empty set.

So the labels are derived from the forms rather than kept in a list somebody has to remember:

```
npm run sync-labels -- owner/repo            # say what is missing; write nothing
npm run sync-labels -- --check owner/repo    # exit 1 if any is missing
npm run sync-labels -- --apply owner/repo    # create them (needs GITHUB_TOKEN with issues: write)
```

It **creates and never updates.** A label that already exists is left exactly as it is — its colour
and description are somebody's choices, made in a UI, and a script that re-asserts them every run is
one that argues with its owner until it gets switched off.

**What still waits for Eric**, and will keep waiting: anything touching `.github/workflows/`,
credentials, or permissions; and anything that is a *taste* call — product direction, naming, what
the thing should feel like. Those are not gated on trust. They are gated on being irreversible or on
being somebody's judgment to make, and both of those would be true on your hundredth change as much
as your first.

## Two repositories, and which to start in

This one is the **harness** — the process itself, and it is mostly prose. That makes it the better
first landing: a change here is a sentence, the checks are fast, and being confused by it is a
contribution rather than a gap.

[`skynet-capital`](https://github.com/ejclark/skynet-capital) is the **system the harness grew inside**
— a real application, with real domain logic, where the same gates run against code rather than
paragraphs. It is the more interesting problem and the steeper one. Go there when the loop here has
stopped feeling like mechanics, which for most people is somewhere around the fifth change.

Neither is a prerequisite for the other. If the application work is what you actually came for, start
there and treat this page as the reference.

## When you want to build something of your own

You will, and the answer is yes — the same harness that runs this repository installs into yours in
one paste. The `README` has it under *"Setting up your own project?"*.

**Worth doing here first, though, and not for our sake.** Your own repository starts with no tests, no
pipeline, no reviewer and nothing that goes red when something is wrong. That is a lot of scaffolding
to build while you are also learning what any of it is for, and it is why a first project so often
stalls at the point where it stops being fun.

Here, all of it already works. You get to watch the loop run — propose, checks, review, merge — on a
change small enough that nothing rides on it. **Then you take a system you have already seen working
into a repo where you decide everything.** That ordering is worth maybe a week and saves considerably
more.

If you already have an idea you are burning to build, do not let this stop you — go build it, and
come back when you want the rails. **A stalled first week is the only real failure here**, and
somebody waiting politely for permission to work on their own thing is one of the ways it happens.

**No idea what to build?** There is a written path from nothing to a working app —
[`FIRST-APP.md`](plugins/harness-core/templates/starter/FIRST-APP.md). Five steps, each ending at
something you can see, starting from one file you open by double-clicking. Paste it at Claude and say
*walk me through this*, or just follow it.

It builds a to-do list, which sounds unambitious and is not: **you already know exactly what it should
do**, so none of your effort goes into deciding and all of it goes into making it exist. And by the
end you are holding the thing that stores what to build next — with the first entries already written,
by you, because building it produced them.

---

## How things get decided

Not needed for your first change. Worth reading after it lands, because it explains why the place
works the way it does: `plugins/harness-core/docs/DECIDING.md`.

The short version: this is a professional setting, courtesy is part of the work, review is always
about the change and never the person — and the expectation is that you build, which includes
building the community. Answering a question, fixing the sentence that tripped you, writing down what
you had to work out: that is contribution, and it counts.
