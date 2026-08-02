import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRepo, forkRepo, ghApi, tokenFromEnv } from "../plugins/harness-core/lib/github.mjs";
import { forkAndImport } from "../plugins/harness-core/lib/import-repo.mjs";
import { pathFor } from "../plugins/harness-core/lib/workspace.mjs";

// The outbound half of the container: fork a repository the runner cannot push to, create a fresh
// one for work the container produces. Everything network-shaped is INJECTED — these cases run
// with no token, no GitHub and no clock, because what they defend is the harness's half of the
// contract: which calls are made, what lands on disk, and what happens when the other side is slow.
//
// What is deliberately NOT tested: GitHub's behavior. The fork endpoint's idempotency and the 202
// timing are GitHub's contract; a test that mocked them in detail would pin our stub, not them.

test("the credential comes from the environment or the error says exactly what to do", () => {
  assert.equal(tokenFromEnv({ GH_TOKEN: "a" }), "a");
  assert.equal(tokenFromEnv({ GITHUB_TOKEN: "b" }), "b");
  assert.equal(tokenFromEnv({ GH_TOKEN: "a", GITHUB_TOKEN: "b" }), "a", "GH_TOKEN wins, same as harness-ship");
  // The refusal must carry its own fix — a bare "no token" is a dead end.
  assert.throws(() => tokenFromEnv({}), /GH_TOKEN.*\n.*mechanism, never the credential/s);
});

test("ghApi surfaces GitHub's own message, not just a status code", async () => {
  const failing = async () => ({ ok: false, status: 422, text: async () => '{"message":"name already exists on this account"}' });
  await assert.rejects(
    () => ghApi("POST", "/user/repos", { name: "x" }, { token: "t", fetchFn: failing }),
    /422: name already exists on this account/,
    "the investigation must end where the error is read",
  );
});

test("ghApi authenticates as a bearer and never as a query parameter", async () => {
  let seen;
  const spy = async (url, init) => ((seen = { url, init }), { ok: true, status: 200, text: async () => "{}" });
  await ghApi("GET", "/user", undefined, { token: "sekrit", fetchFn: spy });
  assert.equal(seen.init.headers.authorization, "Bearer sekrit");
  assert.doesNotMatch(seen.url, /sekrit/, "a token in a URL lands in logs and proxies");
});

test("a fork request goes to the fork endpoint and hands back what the clone needs", async () => {
  const calls = [];
  const api = async (method, path) => {
    calls.push(`${method} ${path}`);
    return { full_name: "me/thing", clone_url: "https://github.com/me/thing.git", default_branch: "trunk" };
  };
  const fork = await forkRepo("acme", "thing", { api });
  assert.deepEqual(calls, ["POST /repos/acme/thing/forks"]);
  assert.deepEqual(fork, { fullName: "me/thing", cloneUrl: "https://github.com/me/thing.git", defaultBranch: "trunk" });
});

test("a created repository is PRIVATE unless somebody typed the flag", async () => {
  // Publishing is the irreversible class: un-publishing removes nothing already cloned. The safe
  // default has to hold even when the caller passes no options at all.
  let sent;
  const api = async (method, path, body) => ((sent = body), { full_name: "me/x", clone_url: "u", private: body.private });
  await createRepo("x", { api });
  assert.equal(sent.private, true, "the default must be private");
  const pub = await createRepo("x", { isPrivate: false, api });
  assert.equal(pub.private, false, "and public must require the explicit choice");
});

test("fork-and-import clones the FORK and wires upstream to the SOURCE", async () => {
  const root = mkdtempSync(join(tmpdir(), "harness-root-"));
  const ran = [];
  const res = await forkAndImport("acme/thing", {
    harnessRoot: root,
    fork: async () => ({ fullName: "me/thing", cloneUrl: "https://github.com/me/thing.git", defaultBranch: "main" }),
    run: (cmd, args) => ran.push(args.join(" ")),
    sleep: async () => assert.fail("a clone that succeeds first try must not wait"),
  });
  assert.equal(res.cloned, true);
  const clone = ran.find((a) => a.startsWith("clone"));
  // Anchored to the host, because /me\/thing/ alone also matches inside "acme/thing" — found by
  // planting exactly that defect and watching this case stay green.
  assert.match(clone, /github\.com\/me\/thing\.git/, "origin must be the fork — pushing to the source is the thing that cannot work");
  const upstream = ran.find((a) => a.includes("remote add upstream"));
  assert.match(upstream, /acme\/thing\.git/, "upstream must be the source, or the checkout cannot track reality");
});

test("a slow fork is met by retrying the CLONE, never by polling the API", async () => {
  const root = mkdtempSync(join(tmpdir(), "harness-root-"));
  const waits = [];
  let attempts = 0;
  const res = await forkAndImport("acme/thing", {
    harnessRoot: root,
    fork: async () => ({ fullName: "me/thing", cloneUrl: "u", defaultBranch: "main" }),
    run: (cmd, args) => {
      if (args[0] === "clone" && ++attempts < 3) throw new Error("empty repository");
    },
    sleep: async (ms) => waits.push(ms),
  });
  assert.equal(res.cloned, true, "the third attempt lands");
  assert.deepEqual(waits, [2000, 5000], "bounded, fixed waits — not a poll loop");
});

test("when every clone attempt fails, the error names the fork and the recovery", async () => {
  const root = mkdtempSync(join(tmpdir(), "harness-root-"));
  await assert.rejects(
    () =>
      forkAndImport("acme/thing", {
        harnessRoot: root,
        fork: async () => ({ fullName: "me/thing", cloneUrl: "u", defaultBranch: "main" }),
        run: (cmd, args) => {
          if (args[0] === "clone") throw new Error("still empty");
        },
        sleep: async () => {},
      }),
    /me\/thing exists but could not be cloned.*re-run/s,
    "the fork survived; only the wait did not — the error must say so",
  );
});

test("an already-imported fork is left alone, same as a plain import", async () => {
  const root = mkdtempSync(join(tmpdir(), "harness-root-"));
  mkdirSync(join(pathFor("thing", "main", { harnessRoot: root }), ".git"), { recursive: true });
  let cloned = false;
  const res = await forkAndImport("acme/thing", {
    harnessRoot: root,
    fork: async () => ({ fullName: "me/thing", cloneUrl: "u", defaultBranch: "main" }),
    run: () => (cloned = true),
    sleep: async () => {},
  });
  assert.equal(res.cloned, false);
  assert.equal(cloned, false, "re-cloning would throw away work somebody has in there");
});

test("the launchers exist, with their Windows twins", () => {
  for (const name of ["harness-new", "harness-new.cmd", "harness-import", "harness-import.cmd"]) {
    assert.ok(existsSync(join("plugins/harness-core/bin", name)), `${name} must exist`);
  }
});
