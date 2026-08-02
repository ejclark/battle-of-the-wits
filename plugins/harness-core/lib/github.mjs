// THE GITHUB SIDE OF THE CONTAINER — the two REST calls that turn "a repository I can read" into
// "a project I can open PRs against", and nothing else.
//
// The harness's collaboration story has an inbound half and an outbound half. Inbound is
// `harness-import`: any repository can be pulled into the workspace and worked on. Outbound was
// only half-built: `harness-ship` opens PRs, but only where push access already exists. These two
// calls close the gap — FORK a repository you cannot push to (the fork is the new GitHub project
// PRs flow through), and CREATE a fresh repository (a home for starter output, or for a new
// container instance).
//
// THE CREDENTIAL IS NOT HERE, BY DOCTRINE. This module reads `GH_TOKEN`/`GITHUB_TOKEN` from the
// environment — the same contract `harness-ship` established — and carries none of its own. The
// harness builds the mechanism; the one credentialed step stays with whoever runs it.
//
// REST core bucket only, and NO POLLING — also `harness-ship`'s rules, for the same resource
// doctrine. A fork request returns 202 and finishes in the background; the caller retries the CLONE
// with bounded backoff rather than polling the API for readiness, because the clone is the thing
// actually being waited on and it fails cheaply.

const API = "https://api.github.com";

/** The token, from the environment or not at all. Absence is an instruction, not a stack trace. */
export function tokenFromEnv(env = process.env) {
  const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "no GH_TOKEN/GITHUB_TOKEN in the environment.\n" +
        "  The harness carries the mechanism, never the credential — export a token with `repo`\n" +
        "  scope (a fine-grained PAT works) and re-run.",
    );
  }
  return token;
}

/**
 * One authenticated REST call, JSON in and JSON out.
 *
 * Errors carry GitHub's own message, because "422" alone sends somebody to the docs while
 * "name already exists on this account" ends the investigation where it started. Injected
 * everywhere it is used, so every caller is testable without a network or a token.
 */
export async function ghApi(method, path, body, { token = tokenFromEnv(), fetchFn = fetch } = {}) {
  const res = await fetchFn(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "battle-of-the-wits-harness",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`GitHub ${method} ${path} → ${res.status}: ${json.message ?? text.slice(0, 200)}`);
  }
  return json;
}

/**
 * Fork `owner/repo` for the authenticated user — the new GitHub project PRs will flow through.
 *
 * Idempotent by GitHub's own contract: forking a repository already forked returns the existing
 * fork rather than an error, so this needs no exists-check of its own — a pre-check would be a
 * second request to learn what the first one already answers.
 */
export async function forkRepo(owner, repo, { api = ghApi } = {}) {
  const fork = await api("POST", `/repos/${owner}/${repo}/forks`, {});
  return { fullName: fork.full_name, cloneUrl: fork.clone_url, defaultBranch: fork.default_branch ?? "main" };
}

/**
 * Create a fresh repository for the authenticated user.
 *
 * PRIVATE BY DEFAULT, and that is a decision rather than a preference: this call is reached by
 * automation, publishing is the irreversible class, and a repo born private can be made public by a
 * human in one click while the reverse un-publishes nothing — clones and caches survive.
 */
export async function createRepo(name, { description = "", isPrivate = true, api = ghApi } = {}) {
  const repo = await api("POST", "/user/repos", {
    name,
    description,
    private: isPrivate,
    auto_init: false,
  });
  return { fullName: repo.full_name, cloneUrl: repo.clone_url, private: repo.private };
}
