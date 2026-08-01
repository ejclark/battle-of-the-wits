#!/usr/bin/env node
// TERRITORY CLAIMS — stop two athletes from fighting over the same files.
//
//   harness-claim <agent> <path>...   # claim territory; exit 1 if it collides
//   harness-claim --release <agent>   # give it back
//   harness-claim --list              # who holds what
//   harness-claim --prune             # drop expired claims
//
// WHY THIS IS THE RAIL BEFORE MORE AGENTS: parallelism stops buying throughput the moment two
// workers edit the same file. You get conflicts, duplicated effort, and — worst — two changes that
// each pass review and disagree once merged. Adding agents past that point makes throughput go
// NEGATIVE, so this has to exist before the fleet grows, not after it hurts.
//
// Three properties decide whether it is safe rather than theatre:
//
//   1. ATOMIC. Two athletes claiming at the same instant must not both win. A read-modify-write on a
//      shared JSON file is a race with a very small window and a very bad outcome, so every mutation
//      goes through an exclusive lock (O_EXCL), which is the one primitive POSIX gives us for free.
//
//   2. EXPIRING. An athlete that crashes must not hold territory forever. A permanent claim from a
//      dead worker is indistinguishable from a live one, and it silently serialises the whole fleet.
//      Claims carry a TTL and are pruned on every read.
//
//   3. SYMMETRIC OVERLAP. Claiming `src/` must collide with a held `src/auth/token.ts`, AND claiming
//      `src/auth/token.ts` must collide with a held `src/`. Checking one direction only leaks exactly
//      the collisions this exists to prevent.
//
// State lives in .harness/claims.json — RUNTIME state, never committed. Two athletes in separate
// worktrees still share the primary checkout's file, which is what makes it a shared registry.
import { readRegistry, withLock as lockRegistry, writeRegistry } from "./registry.mjs";

const ROOT = process.cwd();
const TTL_MS = Number(process.env.HARNESS_CLAIM_TTL_MS ?? 60 * 60 * 1000);

const now = () => Date.now();

// Locking and expiry come from the shared registry: claims and fleet control live in the same
// plugin and CAN import from each other, unlike the standalone scanners that must not cross the
// PATH boundary. Repeating the exception where sharing is easy would be cargo-culting it.
const readClaims = () => readRegistry(ROOT, "claims");
const writeClaims = (claims) => writeRegistry(ROOT, "claims", claims);

const norm = (p) => p.replace(/^\.\//, "").replace(/\/+$/, "");

/** Symmetric prefix overlap — either path containing the other is a collision. */
export function overlaps(a, b) {
  const x = norm(a);
  const y = norm(b);
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

function claim(agent, paths) {
  return lockRegistry(ROOT, "claims", TTL_MS, () => {
    const claims = readClaims();
    const conflicts = [];
    for (const held of claims) {
      if (held.agent === agent) continue; // re-claiming your own territory is idempotent
      for (const p of paths) {
        for (const q of held.paths) {
          if (overlaps(p, q)) conflicts.push({ agent: held.agent, path: q, wanted: p });
        }
      }
    }
    if (conflicts.length) {
      console.error(`✗ territory held by another athlete — not dispatching ${agent}:\n`);
      for (const c of conflicts) console.error(`    ${c.wanted}  collides with  ${c.path}  (held by ${c.agent})`);
      console.error("\n  Pick a different target, or wait for that athlete to release.");
      return 1;
    }
    writeClaims([...claims.filter((c) => c.agent !== agent), { agent, paths: paths.map(norm), expires: now() + TTL_MS }]);
    console.log(`✓ ${agent} holds ${paths.length} path(s) for ${Math.round(TTL_MS / 60000)}m`);
    return 0;
  });
}

const release = (agent) =>
  lockRegistry(ROOT, "claims", TTL_MS, () => {
    const before = readClaims();
    writeClaims(before.filter((c) => c.agent !== agent));
    console.log(`✓ ${agent} released ${before.filter((c) => c.agent === agent).length} claim(s)`);
    return 0;
  });

function list() {
  const claims = readClaims();
  if (!claims.length) {
    console.log("no live claims — the territory is open");
    return 0;
  }
  console.log("live claims:\n");
  for (const c of claims) {
    console.log(`  ${c.agent}   expires in ${Math.max(0, Math.round((c.expires - now()) / 60000))}m`);
    for (const p of c.paths) console.log(`      ${p}`);
  }
  return 0;
}

const argv = process.argv.slice(2);
if (argv[0] === "--list") process.exit(list());
else if (argv[0] === "--prune") process.exit(lockRegistry(ROOT, "claims", TTL_MS, () => (writeClaims(readClaims()), console.log("✓ pruned"), 0)));
else if (argv[0] === "--release") {
  if (!argv[1]) {
    console.error("usage: harness-claim --release <agent>");
    process.exit(2);
  }
  process.exit(release(argv[1]));
} else if (argv.length >= 2) process.exit(claim(argv[0], argv.slice(1)));
else {
  console.error("usage: harness-claim <agent> <path>... | --release <agent> | --list | --prune");
  process.exit(2);
}
