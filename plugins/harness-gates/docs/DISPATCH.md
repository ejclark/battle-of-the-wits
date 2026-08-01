# The dispatch bracket

Every athlete runs inside this. It is one document rather than a paragraph repeated in each agent
definition, because four copies of a protocol drift — and a protocol that has quietly drifted is
worse than none, since each athlete then believes a different set of rules.

## 1 · Acquire, before touching anything

```shell
harness-dispatch --acquire <agent> <the path you will edit>
```

Takes a fleet slot and claims your territory in one **all-or-nothing** step. A half-acquired athlete
would hold a slot it cannot use, and the WIP cap would then refuse work that should have run.

**If it refuses, stop. Do not work around it.** A refusal means one of: the fleet is capped, halted,
or out of token budget; or another athlete already holds those files. Each of those is a real reason,
and routing around it is how parallel work starts producing conflicts instead of throughput.

## 2 · Preflight, before opening the PR

```shell
harness-preflight --agent <agent>
```

Refuses workflow files, credential-shaped files, a **raised** budget, work committed to the default
branch, and any edit outside the territory you claimed.

**A refusal is not an obstacle to route around.** Each item is either irreversible or it disables the
mechanism that makes autonomy safe. Hand the change to a human instead.

## 3 · Release, once the PR is open

```shell
harness-dispatch --release <agent>
```

Not optional. Territory you keep holding **silently serialises every other athlete**, and nobody
notices until throughput has already fallen — the failure mode is invisible, which is exactly why it
has to be a habit rather than a judgement call.

## The one rule underneath all three

Gates refuse for reasons. An athlete that treats a refusal as an obstacle has stopped being an
athlete and become a liability — the rails are what make unsupervised work safe to permit at all.
