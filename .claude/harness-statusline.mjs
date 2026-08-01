#!/usr/bin/env node
// Persona status line — the active harness, and where you are in it, always visible.
//
// Claude Code renders this in its OWN row above the built-in footer badges, so it sits alongside the
// model and difficulty indicators without replacing them. Session JSON arrives on stdin; whatever we
// print to stdout is the row.
//
// WHY THIS IS DISPLAY-ONLY: the status line cannot be a picker. Those selectors are built-in UI, and
// a plugin's settings.json accepts only `agent` and `subagentStatusLine` — not the main `statusLine`
// — which is why the bootstrap writes this into the PROJECT's .claude/settings.json instead of
// shipping it as a plugin file. Switching persona is a config edit or a slash command; this row
// tells you which one is live so the choice is never invisible.
//
// It is also a pure READ surface: everything below is derived from committed state, so it cannot
// drift from reality the way a hand-maintained indicator would. It reads files only — never runs a
// scanner — because this executes on every render and a slow status line is worse than none.
//
// Contract: NEVER fail loudly. A broken status line must not disrupt a session, so every path
// swallows its error and prints nothing.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PERSONAS = {
  dungeon: { icon: "⛬", label: "dungeon" },
  coach: { icon: "▣", label: "coach" },
  orchestra: { icon: "♫", label: "orchestra" },
  corporate: { icon: "▤", label: "corporate" },
  startup: { icon: "▲", label: "startup" },
  senate: { icon: "⚖", label: "senate" },
};

const CHAMBERS = ["The Threshold", "The Scrying Pool", "The Frozen Vault", "The Warden's Gate", "The Throne"];
const PHASES = 5; // the full ladder in lib/phases.mjs
const LOCAL_MAX = 3; // the deepest phase observable from files alone

// Dim grey, then the accent teal that means "machine/system" brand-wide.
const DIM = "\x1b[38;5;244m";
const ACCENT = "\x1b[38;5;79m";
const RESET = "\x1b[0m";

function readStdin() {
  // Only when something is actually piped in. `readFileSync(0)` on a TTY reads until EOF, which is a
  // HANG rather than a throw — the one failure the try/catch below cannot save you from, and the one
  // that would freeze the row instead of hiding it.
  if (process.stdin.isTTY) return {};
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function main() {
  const session = readStdin();
  const root = session?.workspace?.current_dir ?? session?.cwd ?? process.cwd();
  const at = (p) => existsSync(join(root, p));

  let descriptor = {};
  try {
    descriptor = JSON.parse(readFileSync(join(root, "harness.json"), "utf8"));
  } catch {
    // No descriptor means the harness isn't adopted here — print nothing rather than a guess.
    return "";
  }

  const persona = PERSONAS[descriptor.persona ?? "dungeon"] ?? PERSONAS.dungeon;

  // Depth mirrors lib/phases.mjs: the CONTIGUOUS prefix of finished phases. Duplicated here on
  // purpose — this file is copied into a target repo and must not import from the plugin, which may
  // sit anywhere on disk or not be installed at all.
  const installed = at("node_modules") && at(".husky/_");
  const frozen = ["arch", "dupe", "dead", "spec-gap", "clone"].filter((b) => at(`${b}-budget.json`));
  const allFrozen = frozen.length === 5;

  let depth = 0;
  if (at("harness.json") && at("biome.json") && at(".github/workflows/pipeline.yml") && installed) depth = 1;
  if (depth === 1 && frozen.length > 0) depth = 2;
  if (depth === 2 && allFrozen) depth = 3;

  const chamber = CHAMBERS[depth] ?? "cleared";
  // Phases 4 (require `verify` on the default branch) and 5 (auto-merge) are REPOSITORY SETTINGS.
  // A row that reads files cannot see them, so a fully-adopted repo would otherwise sit at "3/5"
  // forever and read as permanently unfinished. Say which wall you have hit instead of implying
  // there is more work in the code.
  const ceiling = depth === LOCAL_MAX ? `${DIM} · rest is repo settings${RESET}` : "";
  return `${DIM}${persona.icon} ${persona.label}${RESET}${DIM} · depth ${ACCENT}${depth}${DIM}/${PHASES} · ${chamber}${RESET}${ceiling}`;
}

try {
  const line = main();
  if (line) process.stdout.write(line);
} catch {
  // Silence is the correct failure mode for a status line.
}
