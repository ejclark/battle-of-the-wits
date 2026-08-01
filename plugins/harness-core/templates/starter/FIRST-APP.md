# Your first app, start to finish

For someone who has never built one. Every step ends with something you can see, and **nothing here
can break anything** — it is your machine and your repository.

If you are working with Claude, paste this whole file at it and say *"walk me through this"*. That is
the intended way to use it, and it needs no plugins, no terminal skills, and no prior setup.

---

## What you are building

A **to-do list that runs in your browser.** Add a task, tick it off, delete it. That is the whole
scope and it is deliberately small.

**Why this one, when it sounds unambitious:** you already know exactly what it should do. That means
none of your effort goes into deciding, and all of it goes into making it exist — which is the part
you have not done before. It also ends at something on a screen that reacts to you, which is worth
more on day one than any amount of correct architecture.

---

## Step 1 · One file, on screen

Make a folder. Put one file in it called `index.html`:

```html
<!doctype html>
<title>My list</title>
<h1>My list</h1>
<input id="what" placeholder="something to do">
<button onclick="add()">Add</button>
<ul id="list"></ul>
<script>
  function add() {
    const li = document.createElement("li");
    li.textContent = document.getElementById("what").value;
    document.getElementById("list").append(li);
    document.getElementById("what").value = "";
  }
</script>
```

Open it in your browser — double-click the file. Type something, press Add.

**That is a working app.** Stop here for a second: the thing on screen changed because of something
you wrote. Everything after this is the same move, repeated.

## Step 2 · Make it yours

Before adding a single feature, change how it looks. Colours, the heading, what the button says, what
happens when you add something. There is no wrong answer and nothing to get right.

This step is not filler. **A project you have decorated is one you come back to**, and one you have
not is a tutorial you finished.

## Step 3 · Serve it properly

Double-clicking a file works, but a real dev server reloads the page when you save. From a terminal
in that folder:

```sh
npx serve .
```

It prints a `localhost` address. Open it. Now edit `index.html`, save, refresh — your change is
there. That loop is what building software actually feels like.

## Step 4 · Now the list writes itself

Use it for one real day. You will immediately want things, and **every one of them is your next
task** — a real feature, correctly sized, that you thought of:

- *it forgets everything when I reload* → `localStorage`
- *I want to tick things off, not delete them*
- *I want to reorder them*
- *I want the finished ones to go grey and drop to the bottom*

Pick one. Build it. Repeat.

**This is the point of building a to-do list first.** A calculator is finished when it works. A to-do
list is finished and then immediately hands you a backlog you own — so you never again have to answer
"what should I build?" from a blank page.

## Step 5 · Put it somewhere real

Right now it exists on one machine and a spilled coffee ends it. Give it a home:

1. Go to **github.com/new**. Name it, leave everything else alone, **Create repository**.
2. That page then shows you the commands to push an existing folder. Paste them in your terminal, in
   your project folder. Refresh the page — your code is there.

If any of that goes sideways, ask Claude: *"I have a folder with my app in it and an empty GitHub
repo at <url>. Get my code into it."* Being handed the commands is not cheating; nobody memorises
them.

**Something changed here that is worth noticing.** It is not a folder any more, it is a project with
a history — every version you have had, kept, and undoable.

## Step 6 · Wire up the pipeline

Now the rails, and now is the right moment: it is real enough that breaking it would annoy you.

Open a Claude Code session on the folder and paste:

```
Set up the dungeon-crawler engineering harness in this repository.

Clone https://github.com/ejclark/dungeon-crawler to a temp directory, run its
plugins/harness-core/bin/harness-bootstrap --auto here, then walk me through what it
wrote, what opinions it imposes, and what is left for me to do.
```

It writes the pipeline, the git hooks, the formatter, and freezes today's debt as the budget you
ratchet down from. It never overwrites a file you already have, and it tells you every opinion it is
imposing so you can disagree on purpose.

**Two things it cannot do for you**, because they need repository-admin rights and it will say so:

- *Settings → General → Pull Requests* → tick **Allow auto-merge** and **Automatically delete head
  branches**
- *Settings → Rules* → a ruleset on your **default branch only**, requiring a pull request and the
  `verify` check — **but turn it on only after `verify` has gone green once**, or every pull request
  waits forever on a check that has never reported

Push, then open the **Actions** tab. Watching your own pipeline run for the first time is the moment
this stops feeling borrowed.

## Step 7 · Take one change all the way round

Now do the whole loop once, deliberately, on something trivial — change the heading colour.

Branch → commit → pull request → checks go green → merge. **On purpose, while nothing is at stake**,
so the first time you do it under pressure it is already familiar.

You now have what most projects never get around to: **a machine that catches your mistakes before
anyone else sees them.** Everything from here is just deciding what to build.

## Step 8 · The better ideas start here

Look back at the list you wrote in step 4. You will notice something: **the ideas got bigger while
you were not looking.** *Remember my tasks* became *sync across my phone*, which is an API, which is
a real project.

That is the actual point of all this. You did not learn a to-do list — you got the machinery and the
loop, and now the only open question is what to point them at. Nobody can answer that for you, and
you no longer need them to.

Bring one back and someone here will help you scope it.

---

**Stuck at any step is a completed step.** Say where you stopped — that is a defect in these
instructions, and it is worth more to us than a finished list.
