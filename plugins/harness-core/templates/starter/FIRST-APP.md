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

## Step 5 · When you want the rails

Once it is real enough that breaking it would annoy you, that is the moment for tests, CI, and the
gates — not before. Open a session on the folder and paste the setup prompt from
[the dungeon-crawler README](https://github.com/ejclark/dungeon-crawler#get-started).

Doing it in this order is deliberate. You now know what the rails are protecting, because it is
yours.

---

**Stuck at any step is a completed step.** Say where you stopped — that is a defect in these
instructions, and it is worth more to us than a finished list.
