# Break it, fix it, send the fix

For the person going through this **first**, on a machine nobody has tried. You will hit things that
are broken. That is the job, not an interruption to it.

The normal shape — *hit a wall, report it, wait for someone to fix it, try again* — costs a round trip
per defect and you find perhaps two a day. This one costs nothing per defect and finds all of them:
**you fix it as you go, and the fixes arrive as one pull request at the end.**

Paste this into a Claude Code session opened on the harness folder.

---

```
I am working through the dungeon-crawler setup on my machine and I want to patch
problems as I hit them rather than stopping to report each one.

How to work:

- When something fails, work out whether the fault is mine, my machine's, or the
  harness's. Say which. If it is the harness's, fix it here and keep going.
- Prefer the smallest honest fix. If the right fix is big or you are unsure, do not
  guess — write down what you found and move on. An accurate description of a
  problem is worth more than a wrong fix for it.
- Keep a running record as you go: what I ran, what happened, what you changed and
  why. I will not remember to ask for this later, so build it as you work.
- After each fix, re-run whatever failed to confirm it is actually fixed.
- Do not touch .github/workflows/ or anything holding credentials. If a fix needs
  one of those, describe it instead and leave it for the owner.

When I say I am done, or when nothing is failing any more:

1. Run `npm run verify` and tell me the result plainly.
2. Put the changes on a branch and open a pull request against ejclark/dungeon-crawler.
3. In the PR body, for each fix: what I hit, what the cause was, what you changed.
   Say which platform I am on — the whole value of these fixes is that they came from
   a machine nobody had tried.
4. Anything you found and did NOT fix goes in the PR body too, under its own heading.
   Do not quietly drop it.

Start by telling me what you see in this folder and what you would try first.
```

---

## Why it is shaped like that

**"Say whose fault it is."** The single most useful line. An unattributed failure is read as
self-inflicted every time, and somebody new will assume it was them and stop. Naming the harness as
the culprit — out loud, before fixing it — is what makes it safe to continue.

**"Keep a running record as you go."** Because you will not remember to ask at the end, and a
reconstruction written an hour later is missing exactly the detail that mattered. The pull request
body should be a *byproduct* of the work, never a task after it.

**"An accurate description beats a wrong fix."** A guessed fix that happens to make the error go away
is worse than no fix, because it hides the real problem behind something that looks solved. Not
knowing is a legitimate and complete answer.

**"Do not touch workflows or credentials."** The one class of change nobody's session should make
unattended, and it is refused to everybody here including the owner. Describing it is the whole
contribution.

## What happens to your PR

`pr-coach` reviews it — value first, mechanics second, the change and never the person. The gates
have already run by then; the review is the part they cannot do.

Expect questions. Expect some of your fixes to be improved on. **Neither means the fix was wrong** —
a first-time contributor finding six real defects is a good week for anybody, and the ones that get
rewritten are usually the ones that found the most interesting problem.
