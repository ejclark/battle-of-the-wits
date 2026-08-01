// Shared runtime registry — locking and expiry for the coordination files under .harness/.
//
// Extracted rather than pasted: claims and fleet control are both in harness-gates and CAN import
// from each other, unlike the standalone scanners which must not cross the PATH boundary. The
// distinction matters — "these files deliberately duplicate" is only true where sharing is
// impossible, and repeating it where sharing is easy would be cargo-culting the exception.
//
// Two properties every registry here needs, and both are easy to get subtly wrong:
//
//   ATOMICITY. A read-modify-write on a shared JSON file is a race with a small window and a bad
//   outcome — two agents both believing they won. Every mutation goes through an O_EXCL lock, the one
//   primitive POSIX gives us for free.
//
//   EXPIRY. A crashed agent must not hold anything forever. An entry from a dead process is
//   indistinguishable from a live one, so state that cannot expire silently wedges the fleet. Entries
//   carry a deadline and are pruned on every read, which makes a crash self-healing.
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HARNESS_DIR = (root) => join(root, ".harness");

/** Run `fn` holding an exclusive lock. Never spins forever — a wedged lock must surface, not hang. */
export function withLock(root, name, ttlMs, fn) {
  const dir = HARNESS_DIR(root);
  mkdirSync(dir, { recursive: true });
  const lock = join(dir, `${name}.lock`);
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      closeSync(openSync(lock, "wx"));
      break;
    } catch {
      try {
        // A lock older than the TTL belongs to a process that is gone.
        if (Date.now() - statSync(lock).mtimeMs > ttlMs) rmSync(lock, { force: true });
      } catch {
        /* raced with another releaser — retry */
      }
      if (Date.now() > deadline) {
        console.error(`registry: could not acquire .harness/${name}.lock within 5s`);
        process.exit(2);
      }
    }
  }
  try {
    return fn();
  } finally {
    try {
      unlinkSync(lock);
    } catch {
      /* already gone */
    }
  }
}

/** Read a registry, dropping expired entries. Corruption rebuilds rather than wedging the fleet. */
export function readRegistry(root, name) {
  const file = join(HARNESS_DIR(root), `${name}.json`);
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return (Array.isArray(parsed) ? parsed : []).filter((e) => !e.expires || e.expires > Date.now());
  } catch {
    return [];
  }
}

export function writeRegistry(root, name, entries) {
  mkdirSync(HARNESS_DIR(root), { recursive: true });
  writeFileSync(join(HARNESS_DIR(root), `${name}.json`), `${JSON.stringify(entries, null, 2)}\n`);
}
