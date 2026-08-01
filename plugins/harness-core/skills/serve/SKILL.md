---
description: Open the local view of this repository — a live page at localhost:4173 showing the overview, each budget's history, the map and the city. Use when asked to "serve", "start the local view", "open the dashboard", "show me the repo in a browser", "run harness-serve", or when somebody wants to SEE the project's state rather than read six command outputs.
---

# The local view

Six gates each answer their dimension honestly and separately. That is right for a gate and useless
as a picture — you learn the numbers by running six commands and holding the answers in your head.
This is those answers, assembled, at one address.

## Run it

```
node ${CLAUDE_PLUGIN_ROOT}/lib/serve.mjs
```

Run it **in the background** and report the URL. It is a server; it does not exit, and waiting on it
blocks the session forever.

Then say what is on each view, so nobody has to click all four to find the one they wanted:

| | |
|---|---|
| `/` | what the instruments say — gates lit, direction, and the doors to everything else |
| `/history` | what each budget looked like before today, read from git |
| `/map` | the repository as territory |
| `/city` | the repository as a skyline |

## Why this and not `harness-serve`

`harness-serve` is the same program and works once the plugin's `bin/` is on `PATH`. Installing a
plugin does **not** put it there, so on a fresh machine the bare command is a confusing failure for
somebody who did everything right.

Going through `node` and an absolute path avoids that, and it avoids the whole Windows class of
defect this project has already hit three times: `node` runs a `.mjs` directly, so nothing depends on
`PATHEXT`, on a `.cmd` twin, or on a launcher being resolvable at all.

## `--port N` if 4173 is taken

The port is the one thing here that is a setting. The **bind address is not**, and no flag will
change it: a repository map names every file and its debt, which is a description of somebody's
codebase that has no business being reachable from another machine. If somebody asks to expose it on
a network, the answer is no, and the reason is that the flag *is* the vulnerability — the value of an
address nobody can widen is that nobody can widen it in a hurry.

## If a view is empty

That is data, not a failure. A repository with no committed budgets has nothing to draw, and the page
says so in those words rather than rendering zeroes — **unlit is not zero**, and a view that showed
an unmeasured dimension as clean would be the false green this whole project exists to prevent.

The fix is to freeze today's debt: run the `bootstrap` drill, or the individual scanners with
`--update`.
