// Territory claims are the rail that lets athletes run in parallel.
//
// Three properties decide whether this is safe rather than theatre, and each has a case here: a
// collision must be caught in BOTH directions, a crashed athlete must not hold territory forever,
// and a corrupt registry must not wedge the fleet. Getting any of them wrong looks fine until the
// day two agents quietly overwrite each other.
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { makeRepo, runTool, bin } from "./helpers.mjs";

const CLAIM = bin("harness-gates", "harness-claim");
const claim = (root, args, env) => runTool(CLAIM, root, args, env);

test("a second athlete cannot take territory already held", () => {
  const root = makeRepo();
  try {
    assert.equal(claim(root, ["decomposer", "src/auth"]).code, 0);
    const blocked = claim(root, ["ui-librarian", "src/auth"]);
    assert.equal(blocked.code, 1, "an exact collision must refuse dispatch");
    assert.match(blocked.out, /held by decomposer/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("overlap is symmetric — a directory and a file inside it collide either way round", () => {
  // Checking one direction only leaks exactly the collisions this exists to prevent.
  const broad = makeRepo();
  const narrow = makeRepo();
  try {
    claim(broad, ["a", "src/auth"]);
    assert.equal(claim(broad, ["b", "src/auth/token.ts"]).code, 1, "file inside a held directory");

    claim(narrow, ["a", "src/auth/token.ts"]);
    assert.equal(claim(narrow, ["b", "src/auth"]).code, 1, "directory containing a held file");
  } finally {
    rmSync(broad, { recursive: true, force: true });
    rmSync(narrow, { recursive: true, force: true });
  }
});

test("unrelated territory is not blocked — the rail must not serialise everything", () => {
  const root = makeRepo();
  try {
    assert.equal(claim(root, ["a", "src/auth"]).code, 0);
    assert.equal(claim(root, ["b", "src/render"]).code, 0, "disjoint paths must both dispatch");
    assert.equal(claim(root, ["c", "src/authorization"]).code, 0, "a shared prefix is not a shared path");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("re-claiming your own territory is idempotent", () => {
  const root = makeRepo();
  try {
    claim(root, ["decomposer", "src/auth"]);
    assert.equal(claim(root, ["decomposer", "src/auth", "src/more"]).code, 0, "an athlete may extend its own claim");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a crashed athlete's claim expires instead of blocking the fleet forever", () => {
  const root = makeRepo();
  try {
    // TTL of 0 makes every write instantly stale — the crash case, without waiting an hour.
    claim(root, ["ghost", "src/auth"], { HARNESS_CLAIM_TTL_MS: "0" });
    const after = claim(root, ["live", "src/auth"]);
    assert.equal(after.code, 0, "an expired claim must not hold territory");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("release frees the territory", () => {
  const root = makeRepo();
  try {
    claim(root, ["decomposer", "src/auth"]);
    assert.equal(claim(root, ["--release", "decomposer"]).code, 0);
    assert.equal(claim(root, ["ui-librarian", "src/auth"]).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a corrupt registry rebuilds instead of wedging the fleet", () => {
  const root = makeRepo();
  try {
    mkdirSync(join(root, ".harness"), { recursive: true });
    writeFileSync(join(root, ".harness/claims.json"), "{not json at all");
    assert.equal(claim(root, ["decomposer", "src/auth"]).code, 0, "corruption must not block dispatch");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--list reports who holds what", () => {
  const root = makeRepo();
  try {
    claim(root, ["decomposer", "src/auth"]);
    const { out } = claim(root, ["--list"]);
    assert.match(out, /decomposer/);
    assert.match(out, /src\/auth/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("incident-scan grandfathers a missing budget instead of crashing", () => {
  // It was the one gate that assumed its budget already existed, so it died with ENOENT on a repo
  // adopting the harness — the exact moment a gate must not fail.
  const root = makeRepo({ "docs/LESSONS.md": "# Lessons\n" });
  try {
    const { out } = runTool(bin("harness-gates", "harness-incident-scan"), root);
    assert.doesNotMatch(out, /ENOENT/, "a first run must not crash on an absent budget");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
