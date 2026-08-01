---
name: onboard
description: >-
  Take a new human contributor from nothing to a merged first change without a terminal, git, or
  prior GitHub experience — account and 2FA, collaborator access, what a branch/fork/pull request
  actually are, the security rules that are genuinely irreversible, one real change landed through
  the web UI, and how review works in both directions. Use when a person rather than an agent is
  joining a repository, when asked to "onboard someone", "get them set up", "help them with GitHub",
  or when a contributor is stuck at the very beginning. Invokable as /onboard.
---

# Onboard — nothing to merged, without a terminal

The *admission* half of the contributor loop. `/intake` preserves a contributor's signal once it
arrives; this drill is what gets them into the building at all.

It has one target, and it is deliberately small: **one merged change, today.** Not a tour, not a
curriculum, not an understanding of the system. A change that landed.

**Read `${CLAUDE_PLUGIN_ROOT}/docs/CONTRIBUTORS.md` before running this drill.** It
carries the reasoning this procedure only executes — in particular the dignity rule, which is not
optional and is the constraint most easily broken by being helpful.

## Who this is written to

The numbered steps are addressed to **the person joining**, in the second person, and can be handed
over verbatim. Steps that require repository credentials are marked **owner-side** and cannot be
delegated — the harness builds the mechanism and hands the owner the one credentialed step.

Whoever is running the drill alongside them holds the service standard, and it is **concierge**: you
carry the whole request rather than handing over a form, you anticipate the next step instead of
waiting to be asked, and you never say *that is not my department*. Nobody is being tested here.
Getting someone productive is your job, not theirs.

## Why "one merged change" and not a better-sounding target

The worst realistic outcome when a non-expert joins a repository run by autonomous agents is not a
bad commit. It is entry 2 in the failure catalog: **a capable person quietly concluding they are not
wanted here.** Every other failure in that catalog costs work. This one costs the person, and it is
the only one no gate can detect — by the time it is visible it has already happened, which is why it
must be designed against rather than watched for.

A merged change is the cheapest defence available, and it is not motivational theatre. It is the
first honest evidence that the rails hold for someone who did not build them. Until one change of
theirs has gone all the way through, every reassurance about the process is a claim.

## Two rules that govern everything below

**1 · The dignity rule.** This procedure is written *for a capability level*, never *about a person*.
"New to git" is a design constraint on a document. "Struggles with git" is a characterisation of a
human being, and it does not go in a file, a commit message, a pull request comment, an issue, or an
agent's prompt. The test: *if they read it, would it be an ordinary thing for them to see?* Notes
that help you calibrate are local, minimal, and describe **what to do next** — "start in the web UI"
— never **what someone lacks**.

**2 · No terminal, no git, no exceptions.** Everything below happens in a browser. This is not a
simplified track that gets swapped for the real one later — a great deal of real work is done
entirely in GitHub's web interface, permanently, by people who never install anything. If a step here
appears to need a terminal, the step is wrong.

## The rule that decides what someone is handed first

From the rope team (`${CLAUDE_PLUGIN_ROOT}/docs/METAPHORS.md`): *never climb above
your last piece of protection.* Applied here it becomes **never hand someone work whose mistakes the
gates cannot catch** — and it binds the owner and every athlete exactly as much as it binds a
newcomer. Nobody in this system is trusted with the irreversible class, and the reason is a property
of those changes rather than of the people making them.

So the first work is prose and the idea log. Wrong prose is embarrassing. Wrong prose is not an
outage, and one squash-merge undoes it.

**And this is not the crossing.** A first pull request is a day hike with a rope on. Dressing it up as
an expedition is how a team acquires ceremony, and ceremony is the thing most likely to make a first
contribution feel too expensive to attempt.

## The part that is actually hard, named up front

A new contributor opens the pull request list, sees reviewed and verified changes landing at machine
speed, and draws the obvious conclusion about their own pace. The comparison is meaningless in a
specific way that is worth stating rather than soothing:

- An athlete's behaviour is **specified by a contract**, which is why a gate can check it before
  anything lands. A brand-new agent is trusted with more than a brand-new human *because a gate
  bounds it and cannot be talked out of it* — not because it is better.
- The one signal this system most needs is **what a stranger sees**, and no athlete can produce it.
  Neither can the people who built the thing: expertise destroys the instrument that measures
  confusion.

Two more things belong in the open, because discovering them later feels like a verdict:

**A second human does not double throughput on day one.** For a while it lowers it — every change
arrives at the same scarce review attention, plus the cost of orientation. The honest sequence is
cost, then break-even, then gain. It is written down, it is expected, and it is not a debt anyone
owes.

**Stuck for fifteen minutes means ask.** The cost of a question is bounded and small. The cost of
someone quietly deciding this is not for them is neither, and it is paid in full before anyone
notices it is being paid.

---

## 1 · The two things nobody can undo

Everything else in this drill is recoverable. These two are not, which is why they are first.

**Create the account, and turn on two-factor authentication while you are in there.** One line for
why: *an account that can change code is worth stealing, and a password alone does not stop that.* An
authenticator app or a passkey beats SMS. **Save the recovery codes somewhere real before moving
on** — losing 2FA without them means losing the account outright, and it is the most common way a new
contributor gets permanently locked out. Not in the repository, not in a chat, not in a note synced
to the account you are protecting.

**Turn on email privacy in the same sitting, BEFORE the first commit** — Settings → Emails → *Keep my
email address private*. This is the third irreversible step and the one nobody thinks to mention.
Every commit permanently records whatever address git is configured with, into a history that is
public, forked, and mirrored; no revert un-publishes it, and the person it exposes is usually
somebody who never chose to publish it. GitHub then supplies a `users.noreply.github.com` address
instead, which works everywhere. Ordering is the whole point here: this setting protects future
commits and cannot retract past ones, so it is worth thirty seconds now and a rewrite of history
later.

**Never paste a secret anywhere.** A secret is a long random-looking string that a machine accepts
*as an identity*: `ghp_…`, `sk-…`, `AKIA…`, anything sitting next to the words key, token, secret or
password, the contents of a `.env` file, and — the one everyone forgets — a screenshot with any of
that visible in it.

A password is something you type. **A token is something a machine reads, and to that machine the
token simply *is* you** — no prompt, no second factor, from anywhere in the world, at three in the
morning, silently. That is the whole difference, and it is why one is a nuisance to leak and the
other is an incident. If you are not certain whether something is a secret, treat it as one until the
owner says otherwise.

Never put one in a pull request, a commit, an issue, a comment, or a chat message. In a public
repository a comment is published the instant the button is pressed, and it is immediately in the
API, in email notifications, in forks, in mirrors, and in caches nobody can reach.

### If you think you leaked something

> **Tell the owner immediately. Rotation, not deletion.**

Deleting the comment removes it from the page and from nowhere else. It does not un-leak: a deleted
comment was already mailed to everyone watching, and a secret in a commit stays in the history. The
only thing that ends the exposure is **rotating** the credential — replacing it so the leaked copy
stops working — and only the owner can do that. Deletion feels like the fix, which is exactly why
these get found late.

Say it in the earliest, ugliest form available: *"I think I just pasted a token into PR 14."* Nobody
is ever in trouble for reporting one. Speed is the entire remedy — minutes of embarrassment against
a month of exposure — and the only expensive version of this mistake is the quiet one.

Say that last sentence out loud when you run this drill. The instinct to quietly delete and hope is
universal, it has been indulged by people who have done this for twenty years, and it is the one
thing that turns a two-minute fix into a real incident.

## 2 · The invitation, and the first phishing lesson

**Owner-side.** Repository → Settings → Collaborators. This requires the owner's credentials; nobody
else can do it and nobody else should try. Run `harness-standing --zoning` once first, and send four
things: the repository URL, the tier being granted, the path to the idea log *in this repository*,
and the sentence "the invite will arrive by email from GitHub." That last one matters more than it
looks.

**Then, for the person joining: an unexpected repository invitation is a phishing attempt until
proven otherwise.** Do not act on a repository invite, a security alert, a failed-check notification,
or an access-will-be-revoked warning by clicking the link inside it. Open github.com yourself, in a
new tab, and look at your own notifications. The real invitation is sitting there.

Collaborators are phished *because they are collaborators* — the account is a route into software
other people run. The attempt will be well written, correctly branded, and timed for the week you are
expecting exactly that email. The reliable tells are structural rather than cosmetic: a login form
reached from a link, urgency about losing access, a "GitHub support" message arriving somewhere
GitHub support does not operate, and a prompt to **authorize an application** to act on your account.
GitHub never needs your password on a page you reached from an email, and nothing in this drill
requires authorizing any third-party app, ever.

Accepting puts you at the **contributor** tier: documentation, the idea log, and specs. That is the
rope-team rule above rather than a probationary ritual — the radius widens on evidence, and
`harness-standing` derives that evidence from what actually held rather than from anyone's opinion.
Note what it will never do: *eligible* is not *promoted*.

**Stop here and confirm they can see the repository while signed in.** Half of all onboarding
failures are somebody looking at a page they are not signed in to.

## 3 · What the words actually mean

They will meet these in the first five minutes. Dumbing them down teaches something that has to be
un-taught later, which is worse than not explaining at all. These are short *and* true.

| Word | What it is |
|---|---|
| **repository** | The project, plus every version of it that has ever existed. Git stores history rather than just files, which is why almost everything here is undoable. |
| **commit** | A save-point with a note attached. Not "saving the file" — it is "here is a change, and here is why it was made". |
| **branch** | A named line of work: your own copy of the whole project, which you can change without anything anyone else sees moving. Making one costs nothing and breaks nothing. |
| **`main`** | The branch that counts as *the project*. It is protected — nobody writes to it directly, including the owner. Everything arrives by pull request. |
| **pull request** | A proposal that your branch's changes become part of `main`, with the exact differences attached and a conversation stapled to it. Not a submission, and not a request for permission: it is how everyone here changes anything. |
| **fork** | Your own complete copy of the repository under your own account. It is what you use when you do **not** have write access to the original — an outside contributor forks, changes their copy, and opens a pull request from it. |
| **merge** | The moment a proposal is accepted and the changes become part of `main`. |

You were invited as a collaborator, so you will use **branches**, not forks. Both end in a pull
request; the only difference is where the branch lives, and nothing is lesser about either. That is
worth knowing rather than skipping, because most instructions written on the internet assume a fork
and will otherwise read as though they describe a different system.

The one place this table simplifies: *"a branch is a copy"* is not literally how git stores things —
there is one history, and a branch is a pointer into it. The simplification is safe in exactly one
direction, which is why it is worth using: it never leads you to expect *less* isolation than you
actually have.

> **Nothing you do on a branch can break anything.** The real version is untouched until a pull
> request is merged, and a merge can be undone in about ten seconds. The system is built so that
> being wrong is cheap — that is what all the automated checks are for.

## 4 · Your first change is not a chore invented to include you

The best first contribution is **a fix to something that confused you in the last hour.**

That is not a starter task. Right now, and only right now, you are the one person who can see this
system the way a stranger sees it. It expires — within a week you will know too much to be confused
by it, and the information is gone permanently, from everyone. Whatever was unclear during setup *is*
a real defect, you are currently the only person able to see it, and writing it down is a change to
prose that no amount of inexperience can make dangerous.

So from step 1 onward, keep a scratch note of every place you had to read something twice, guess, or
ask. **That note is the contribution.**

Pick **one** — the sharpest, not the longest list. One observation per entry: a paragraph containing
four findings gets read as one, and three of them quietly disappear.

Write down what you **saw**, not what should be done about it. *"The invitation did not say which file
to open first"* survives being solved five different ways. *"Add a getting-started link"* is one of
those five, pre-committed before anyone checked the others. `/intake` carries the full reasoning; this
is the short version, and it is the same rule everyone already here is held to.

## 5 · Land it — the exact clicks

1. Open the repository. Click into `docs/`, then `IDEAS.md` — or wherever the invitation said the
   idea log lives.
2. **If there is no idea log yet:** "Add file" → "Create new file", name it `docs/IDEAS.md`, and start
   it with an `# Ideas` heading. Creating it is a legitimate first contribution, not a workaround.
3. Click the **pencil icon** at the top right of the file ("Edit this file").
4. Add your entry at the end of the open section, matching the form and the numbering the file
   already uses:

   ```markdown
   **12. The invitation does not say which file to open first.**
   Read the invitation, opened the repository, and could not tell whether to start in the README or
   the document it links to. Expected the invitation to name one file. _(src: <your name> · while:
   first run through /onboard)_
   ```

   Your name goes in `src:` because the attribution *is* the credit — and the tooling parses that
   field, so it is how the entry carries its provenance rather than a courtesy.
5. Press **"Commit changes…"** and choose **"Create a new branch for this commit and start a pull
   request."** GitHub proposes a branch name; accept it.
6. **Start the title with a lowercase word**, in the form `docs: log an observation from a first
   run-through`. If the repository uses Conventional Commits — this one does, and its commitlint
   rejects a capitalised first word — that is the shape. The pull request title matters more than the
   commit message, because the merge squashes the branch into one commit and **the title becomes the
   permanent line in the history**.

   **Just give them the exact title to use the first time.** Explaining a commit convention before
   someone's first merge is teaching the least interesting thing at the least useful moment.
7. Fill in **Summary** and **Why** in the template, one or two plain sentences each. Leave the
   collapsed details block alone — those checkboxes are for changes that touch code.
8. Press **"Create pull request."** That is the whole contribution.

## 6 · The checks, and what red actually means

A machine now runs the project's suite against the branch. Yellow is running. Green passed. **Red
means one specific thing failed, in one specific place, and it will say which.**

**Stay with them while it runs.** Watching automated checks appear against your own change is the
moment the system stops being abstract, and it is worth narrating: *those are running the same tests
I run — if they are green, nobody has to take our word for anything.*

What red is not: a verdict on anyone, or a sign the pull request should not have been opened. The
athletes go red constantly. A failed run is a practice pull, which is precisely why unlimited cheap
machine iterations are the strategy rather than an embarrassment. Click **Details** next to the failed
check and find the step that stopped; every refusal this harness writes is required to name what to do
next, not merely what is wrong.

**Which produces a rule that runs in the contributor's favour, and it is a real rule rather than a
kindness:** if a red check says what is wrong without saying what to do next, **that is a defect in
the harness**, and reporting it is worth more than the change it interrupted. You are not failing to
understand it; it is failing to say. Bank it as an observation like any other.

Nobody has to fix a check they do not understand. Say what it says and hand it over — handing over is
the designed outcome of hitting a rail, not a failure at it, and the preflight's own refusal message
says so in those words.

**Never let someone hit a red gate alone in the first week.** Not because they cannot handle it, but
because a refusal read alone in an unfamiliar system means something very different from the same
refusal read together. Fix it in the same pull request, then merge it. Not tomorrow.

## 7 · Review — receiving one

Someone reads the differences and comments. Usually the owner, sometimes Claude.

- **"Request changes" is not rejection.** It is the button that means *one more round*. Approval and
  requested-changes differ only in whether the merge should wait.
- A comment may arrive as a **suggestion block** with an "Apply suggestion" button. Pressing it
  commits that change to your branch; that is the intended use, not a shortcut.
- To edit more yourself: open the file **on your branch** — the "Files changed" tab, the three-dot
  menu on the file, "Edit file" — change it, and commit to the same branch. The pull request updates
  itself. There is no second pull request to open, ever.
- **Reply to every comment, even with one word.** "Done" is enough. Unreplied review comments are the
  most common reason a change sits untouched for a week: from outside, silence and stuck look
  identical.
- **Disagreeing is allowed, and it is the useful case.** Say what you saw. Disagreements about
  observations resolve by looking at the thing; disagreements about prescriptions do not resolve at
  all, which is the entire reason `/intake` is built around the difference.

One honest note about the owner of a repository like this: he is opinionated and will say no to
changes, including good ones. The gates say no first and impersonally, so most refusals here are never
a person rejecting a person — and a no on a change is a no on a change.

## 8 · Review — giving one

They will be asked to review changes, and not as a courtesy.

"Files changed" → hover a line → the blue **+** → write the comment. Then "Review changes", and pick
**Comment** unless you specifically mean Approve or Request changes.

**The highest-value review available here is the one nobody else in the system can write:**

> *"I read the summary and I still don't know what this changes."*

That is an observation about a real defect in how the change was explained, and the author is
structurally incapable of producing it — they knew what they meant before they started typing. It is
not a confession, and it is filed with no apology attached.

Two boundaries that keep this honest:

- **Never approve a diff you did not understand as though you did.** "I can't judge the code; the
  description reads clearly" is a precise, useful review, and everyone knows exactly what it means.
- **You are not being asked to catch bugs.** Overlapping automated nets do that, and they are better
  at it than any reader. You are being asked what a person sees.

## 9 · Merged — and wired in

The **squash-merge** compresses every commit on the branch into one commit on `main`, with the pull
request title as its message. Press **"Delete branch"** — the button appears because the branch has
finished its job. Nothing is thrown away; the change is in `main`'s history now.

Then, once something of theirs has landed:

- **Add them to the local roster** at `.harness/roster.json`, which is **gitignored and stays that
  way**. It names real people, and a repository is not a place to publish a list of them.

  ```json
  [{ "id": "<handle>", "kind": "human", "tier": "contributor", "identities": ["<their-git-email>"] }]
  ```

  `identities` is how `harness-standing` matches commits to a person. Include every address they might
  commit under — GitHub's web UI uses a `users.noreply.github.com` address by default, which is a
  different one from the address on their account, and a roster listing only the latter measures them
  as having done nothing.

- **Show them `harness-standing`.** Not as a scoreboard — as the answer to *"what am I allowed to
  touch?"*, which is the question they actually have and are unlikely to ask. It recomputes from the
  git log every time it is read: nothing is stored, awarded, or accumulated, so there is no counter to
  inflate and no way to be owed standing the history does not show. Say the part that is easy to get
  wrong out loud: **the tool never promotes anyone.** It reports what the history shows, and widening
  someone's access stays a human decision. It also does not measure whether the work was good — git
  cannot tell a careful change from a trivial one, and a harness that scored "impact" would be
  inventing a judgement and presenting it as arithmetic.

- **Say what a visitor-tier contribution is worth**, because the tier names sound like a hierarchy and
  this one is genuinely not the bottom of it: *the thing you can do that I cannot is notice when
  something is confusing. I can't — I wrote it.* Then route every piece of that through `/intake`
  (`${CLAUDE_PLUGIN_ROOT}/skills/intake/SKILL.md`), which keeps the observation and drops the
  prescription.

Then do the second one. The path is known now and the ceremony is over, which was the point.

---

## 10 · The serious half — how decisions get made here

Do this **after** the first merge, not before. The mechanics have to be real first, or this reads as a
lecture; once something of theirs is in `main`, it reads as an explanation of a thing they just did.

Walk them through `${CLAUDE_PLUGIN_ROOT}/docs/DECIDING.md` — the north stars — in about twenty
minutes. Do not hand it over and hope. The four things that must land, in this order:

1. **This is a professional setting.** Respect and courtesy are part of the work, review is about the
   change and never the person, and **the expectation is that you build — and that includes building
   the community.** Answering a question, fixing the sentence that confused you, writing down what you
   had to work out: that is contribution and it counts. It has never been easier to help someone, and
   it has never been easier to build a solution. Both are new, and both change what is worth trying.

2. **If you can explain it, you can build it** — and therefore *the explanation is the work*. This is
   the point that makes a non-technical contributor's position obviously strong rather than obviously
   weak, so make it explicitly: the bottleneck is no longer implementation, it is knowing precisely
   what we mean. **Communication is hard for structural reasons** — the words that feel most precise
   (*simple*, *fast*, *better*) carry the most unexamined disagreement. When something needs to be
   pinned down exactly, `/harness-core:ears` is the drill for it.

3. **Theory of Constraints — how to choose what to do.** One binding constraint at a time; improving
   anything else changes nothing. Give them the tactical form (*work on what is in front of the
   constraint*) and the strategic form (*watch the trend line, not today's number* — a constraint
   tightening for a month is a different situation from the same number reached last week, and
   correcting early is cheap where correcting late is a rewrite). Then say what the constraint here
   currently is and why several rules that look odd are subordination to it.

4. **The Three Ways — flow, feedback, learning** — and the asymmetry that matters most right now: **AI
   made producing cheap and left verifying exactly as expensive as it was.** That is why most of this
   harness lives in the second Way. It is also the honest answer to "why so many gates?".

Then the part worth saying out loud, because it reframes everything above from process into
progression: **elevating a constraint unlocks a class of action that was previously impossible, not
merely slow.** That is a level-up, not a speed-up — and the question *what constraint emerges after
this one?* is the most productive question anyone here can keep asking, because its answer names the
next capability the system does not have yet.

Close by asking them which part they would explain differently. They have just met all of it cold,
which is a vantage point that lasts about a week — and `/intake` is where the answer goes.

---

## Designing against the failure this drill actually exists for

Not a broken build. **A capable person quietly concluding they are not wanted here.**

They have joined a repository where autonomous agents open verified pull requests at machine speed,
where the documentation argues with itself in paragraphs, and where a red check they do not understand
can appear on the first thing they ever wrote. No gate detects this one, so:

- **Speed is kindness.** A first pull request that sits for two days teaches that contributions go
  into a void. Merge it the same day, even if it is one sentence.
- **Attribute in public, correct in private.** Their name on a logged observation, in the repository,
  where it stays.
- **Say the quiet part.** *"This system is genuinely unusual, and most of it was built for robots.
  Anything that seems confusing is far more likely to be a real defect than a gap in you — and telling
  me about it is worth more than the change you came here to make."* That is not reassurance. It is an
  accurate description of where the value is, which is the whole reason to say it out loud rather than
  hope it gets inferred.

## Boundaries

- **Collaborator access, 2FA enforcement, and anything touching credentials is the owner's action.**
  Never walk someone through granting themselves access, and never handle their credentials for them,
  however helpful it would be.
- **Never write down an assessment of a person.** See the dignity rule above. It is the boundary most
  easily crossed while trying to be useful, because the note that would genuinely help you calibrate
  is exactly the note that would humiliate them to read. Any characterisation of a named human in a
  public repository is world-readable, permanent in history, mirrored into every fork, and copied into
  strangers' caches — the same irreversibility as a leaked credential, except the person harmed is a
  friend.
- **Do not raise a tier because someone is doing well.** `harness-standing` reports eligibility;
  promotion is the owner's call and is never urgent. A tier granted early is the one rail here that
  cannot be un-granted without it being personal.

## How to know whether this is working

Stated in advance, so it cannot later be mistaken for a judgement about anyone: **after roughly ten
landed changes, the owner's time per merged change of theirs should be clearly falling.** If it is
not, the model is not working — and the likely cause is that the work being routed was chosen to
*feel* helpful rather than to subtract load.

The fix in that case is to change what is handed over. It is not more process, and it is not anyone
trying harder.
