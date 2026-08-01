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
5. **Create pull request**, then fill in the template. If your change is prose only, tick the
   prose-only box and stop — the rest of that checklist is for changes that touch code, and CI runs
   the full suite either way.

Then the automated checks run. Watching them appear against your own change is the moment this stops
being abstract. **If one goes red, that is information, not a verdict** — read it with someone the
first few times, and fix it in the same pull request.

---

## What you can change right now

Your account is enough for all of these. Nothing here requires anyone to grant you anything first.

| | Where |
|---|---|
| Anything you found confusing on this page | this file |
| A sentence in the README or any doc | `README.md`, `docs/` |
| An idea worth remembering | `docs/IDEAS.md` |

If a change of yours is merged and you would like more room later, that is a conversation with the
owner — it is never automatic, and it is never a score.

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

## How things get decided

Not needed for your first change. Worth reading after it lands, because it explains why the place
works the way it does: `plugins/harness-core/docs/DECIDING.md`.

The short version: this is a professional setting, courtesy is part of the work, review is always
about the change and never the person — and the expectation is that you build, which includes
building the community. Answering a question, fixing the sentence that tripped you, writing down what
you had to work out: that is contribution, and it counts.
