---
name: profile
description: >-
  Help a contributor build their own professional GitHub profile — the special `<username>/<username>`
  repository whose README renders on their profile page. Doubles as the safest possible first git
  exercise: their repo, zero blast radius, a real result they own. Use when someone new is joining,
  when asked to "help set up my GitHub profile", or as the warm-up before a first contribution.
  The contributor writes it; this drill supplies the mechanics and the questions, never the claims.
---

# Profile — the safest first repository, and a thing they keep

Two things share the word *profile* in this project and they are opposites. Getting them confused is
the failure this drill has to avoid, so it goes first:

| | **A profile ABOUT someone** | **A profile BY someone** |
|---|---|---|
| Written by | someone else | themselves |
| Published by | someone else | themselves |
| Example | "still shaky on branches" | "I'm learning Go and I like maps" |
| Belongs | **nowhere the repository can reach** — see the dignity rule in `${CLAUDE_PLUGIN_ROOT}/docs/CONTRIBUTORS.md` | on their own GitHub profile, entirely theirs |

The difference is **authorship and consent**, and it is total. The roster in `.harness/` is closed,
local and gitignored precisely because a characterisation of a person must not be published. This
drill is the complement: the one place a profile legitimately *is* public is the one the person wrote
about themselves.

So the rule that governs everything below: **they write it. You supply the mechanics and the
questions.** Never generate claims about a person and hand them over to publish as their own — that
is hollow at best and a misrepresentation at worst, and they will be the one living with it.

## Why this is the right first exercise

Better than a first pull request against a shared repo, and it is worth knowing why:

- **It is their repository.** Nothing they do can affect anyone else's work, so the whole category of
  "what if I break something" simply does not apply. That fear is the real blocker in hour one.
- **It teaches exactly the mechanics they need next** — create a repository, edit a file, write a
  commit message, see the result — in a sandbox where being wrong costs nothing.
- **The payoff is real and immediate.** A page they are pleased to send someone. Contrast with fixing
  a sentence in someone else's docs, which is genuinely useful but feels like homework.
- **It is portable.** It belongs to them, outlives any project, and is a career asset rather than a
  contribution to ours. Offering it *before* asking for anything is the point.

**Offer it; never require it.** Framed wrong, "let's build your professional profile" reads as *you
are not presentable yet*, which is exactly the failure the dignity rule exists to prevent. It is a
gift or it is nothing.

## 1 · The ideal place, and why it scales

GitHub reserves one repository name per account for this: **a public repo named exactly the same as
the username.** Its `README.md` renders at the top of `github.com/<username>`.

For a user `octocat`, that is the repo `octocat/octocat`, containing `README.md`.

This is the answer to *where should it live* and it scales for free, because it is GitHub's own
mechanism rather than a convention someone has to be told:

- **Discovery is automatic.** Anyone who lands on their profile sees it. No link to share, no index
  to maintain, nothing to keep in sync.
- **It is version-controlled**, so improving it is itself a git exercise, forever.
- **One per person, named by rule**, so there is no naming decision, no place to look it up, and no
  chance of two of them.

The mechanics, in the browser:

1. **New repository.** Name it *exactly* their username — capitalisation as GitHub shows it.
   GitHub will show a note saying they have found a **secret/special repository**; that confirmation
   is how you know the name is right.
2. **Public**, and **tick "Add a README file"**.
3. **Create repository**, then edit `README.md` with the pencil icon.

If the special-repository note does not appear, the name does not match — that is the only way to get
this wrong, and it is fixable by renaming.

## 2 · What goes in a good one

The default failure is **badge soup**: a wall of shields, auto-generated streak counters, a trophy
case, and nothing a human wants to read. It looks like effort and communicates nothing.

A good one is short and answers three questions someone actually has:

- **What are you working on or into right now?** Present tense, specific. *"Learning how CI pipelines
  work"* beats *"passionate about technology"*, because the first is true of one person.
- **What should someone message you about?** An invitation, so the page has a purpose.
- **How do they reach you?** Only channels they are happy to have indexed forever.

Ask those three as questions and write down their answers in their words. **Do not improve the
voice.** A profile that sounds like a press release reads as a press release, and the small
specific details — the odd hobby, the thing they are stuck on — are the parts people remember.

Six to ten lines is plenty. It can grow.

## 3 · The privacy pass, before they publish

A profile page is public, indexed, and archived by third parties. Go through this *before* the first
commit rather than after, because the whole list is irreversible:

- **Email privacy on** — *Settings → Emails → Keep my email address private* — before any commit,
  including this one. Every commit permanently records whatever address git holds.
- **Nothing they would not put on a billboard**: home town at street granularity, employer if that is
  sensitive, family details, anything about somebody else who has not agreed to be mentioned.
- **A contact channel they can abandon.** A dedicated address rather than their main one.
- **No secrets, ever** — including in a screenshot of a terminal, which is the way it usually happens.

Say the reason out loud, once: **anything published here is effectively permanent.** Deleting a repo
does not un-publish what was already crawled. That is not a reason for anxiety, it is a reason to
choose deliberately for ten minutes.

## 4 · Land it, and notice what just happened

They commit the README. Then point out what they have already done, because they will not notice:
they created a repository, made a commit, wrote a commit message, and published something. That is
the whole mechanical vocabulary of the next contribution, learned somewhere nothing could break.

Then the honest handoff: **the next repository works the same way, except changes arrive as a pull
request so someone can look first.** That is the only new idea, and it now has somewhere to land.

## Boundaries

- **Never write claims about them.** Ask, record, do not embellish. If an answer is thin, ask a better
  question rather than filling the gap.
- **Never touch their account settings for them**, and never handle their credentials, even helpfully.
  Walk beside; do not drive.
- **Do not turn it into a portfolio project.** Pinned repos, contribution graphs, a personal site —
  all fine later, none of it today. The goal is one page they are pleased with and the confidence
  that came from making it.
- **This is not a gate on contributing.** Someone who does not want a profile contributes exactly the
  same, and nothing anywhere records that they declined.
