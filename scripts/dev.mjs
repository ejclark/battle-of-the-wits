#!/usr/bin/env node
// `npm run dev` — the data server and the UI server, started together, killed together.
//
//   npm run dev              # UI on 4173 with hot reload, data on 4174
//   npm run dev -- --port N  # move the UI; the data server follows on N+1
//
// TWO PROCESSES BECAUSE THERE ARE TWO JOBS. The data comes from the filesystem and from git, which
// needs Node; the UI wants a bundler with hot module replacement, which does not. Running them
// separately keeps each one able to do its job badly without taking the other down — and it is why
// `npm start` still works with no bundler at all, which is the path every adopter is on.
//
// ONE COMMAND, THOUGH. Two terminals and a remembered port order is exactly the friction that makes
// somebody stop opening a tool, and the second terminal is always the one that got closed.
//
// AND THEY DIE TOGETHER. An orphaned data server holding 4174 makes the next `npm run dev` fail with
// EADDRINUSE, which reads as "the tool is broken" rather than "something from ten minutes ago is
// still running". Both signals are handled, and the exit of either takes the other with it.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const uiPort = Number(argv[argv.indexOf("--port") + 1]) || 4173;
const apiPort = uiPort + 1;

// Windows has no `npm`, it has `npm.cmd`, and execFileSync/spawn do not consult PATHEXT — the defect
// this project's first contributor found three separate times. `node` runs a .mjs directly, so the
// data server needs no such handling; only the bundler goes through a package binary, and it is
// resolved from node_modules rather than from PATH for the same reason.
const rspackBin = join(REPO, "node_modules", ".bin", process.platform === "win32" ? "rspack.cmd" : "rspack");

const children = [];
const run = (label, cmd, args, env = {}) => {
  const child = spawn(cmd, args, {
    cwd: REPO,
    stdio: "inherit",
    env: { ...process.env, ...env },
    // A .cmd is not directly spawnable on Windows (CVE-2024-27980 hardening); route it through the
    // shell there, and only there, with no interpolated arguments.
    shell: process.platform === "win32" && cmd.endsWith(".cmd"),
  });
  child.on("error", (err) => {
    console.error(`\n  ✗ ${label} could not start: ${err.message}\n`);
    shutdown(1);
  });
  child.on("exit", (code) => {
    // The first one to go takes the other with it, rather than leaving half a dev environment up and
    // a page that half works.
    if (!shuttingDown) {
      console.error(`\n  ✗ ${label} exited (${code ?? "signal"}) — stopping the other half too.\n`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
  return child;
};

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* already gone — that is the desired state anyway */
    }
  }
  process.exit(code);
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => shutdown(0));

console.log(`\n  ⛬  dev — UI on http://127.0.0.1:${uiPort}, data on http://127.0.0.1:${apiPort}\n`);
console.log("      Editing web/ hot-reloads the page. Editing a view under plugins/ restarts nothing —");
console.log("      the data is re-derived per request, so a refresh is enough.\n");

// The data server does not open a tab; the bundler's dev server does, and two tabs for one command
// is the kind of small rudeness that makes a tool feel unfinished.
run("data server", process.execPath, [join(REPO, "plugins/harness-core/lib/serve.mjs"), "--port", String(apiPort), "--no-open"]);
run("ui server", rspackBin, ["serve", "--port", String(uiPort)], { HARNESS_API: `http://127.0.0.1:${apiPort}` });
