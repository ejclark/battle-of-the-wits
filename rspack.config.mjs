// THE DEV BUILD — the client-side app, with hot module replacement.
//
// TWO SERVERS, ONE PAGE, and the split is the whole design. The data comes from the filesystem and
// from git, which needs Node — so `harness-serve` keeps deriving it and answers `/api/state`, and
// rspack serves the UI and proxies the API to it. Neither one grows a copy of the other's job.
//
// WHAT SURVIVES WITHOUT THIS. `npm start` still runs the zero-dependency, server-rendered views, and
// that is not a fallback kept out of nostalgia: an adopter installs the plugins and has no build
// step, so a UI that only exists after a bundler runs is a UI they do not have. This config is the
// DEVELOPMENT experience — hot reload while you edit a view — and the shipped path stays installable
// by anyone who typed `npm start`.
//
// EVERY LINE HERE IS A DEVIATION FROM A DEFAULT, AND HAS TO EARN IT. A config option is a decision
// the system failed to make, and one that merely restates a default is worse than absent: it reads
// as a considered choice, so the next person leaves it alone, and it silently pins behaviour when
// the tool improves underneath. This file was cut from twice its length by deleting everything that
// rspack already does — including a `resolve.extensions` that was quietly NARROWING resolution and
// would have broken the first `.json` import anybody tried.
import { rspack } from "@rspack/core";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// The API server's port. The UI keeps 4173 — the address people already have — and the data server
// moves to 4174, so the URL nobody has to relearn is the one that still works.
const API = process.env.HARNESS_API ?? "http://127.0.0.1:4174";

export default {
  entry: { main: "./web/main.js" },

  // Not the default `dist/`: the client app is one part of a repository that is mostly not a client
  // app, and a top-level `dist/` in a plugin marketplace reads like the marketplace's own build.
  //
  // fileURLToPath and NOT `new URL(...).pathname`, which was the first version of this line and is
  // wrong on Windows: it yields `/C:/Users/...`, with a leading slash before the drive letter, which
  // is not a path any Windows API accepts. The shorter expression reads fine on the machine that
  // wrote it and breaks on the machine that did not.
  output: { path: resolve(HERE, "web/dist") },

  // NOT a default, verified by deleting it: without this the build fails on the first `@import`-less
  // plain stylesheet with "you may need an appropriate loader". Native CSS, so no loader chain and
  // no extract plugin — editing a token hot-swaps the stylesheet instead of reloading the page.
  experiments: { css: true },
  // And the rule as well: `experiments.css` alone was not enough — verified by trying it. Both are
  // required for a plain `.css` import to resolve.
  module: { rules: [{ test: /\.css$/, type: "css" }] },

  plugins: [new rspack.HtmlRspackPlugin({ template: "./web/index.html" })],

  devServer: {
    // THE ONE SECURITY PROPERTY, STATED RATHER THAN INHERITED. The default is already loopback-only,
    // so this line changes nothing today — and it stays anyway. A repository map names every file and
    // its debt, which is a description of somebody's codebase that has no business being reachable
    // from another machine; that guarantee is not one to hold on the strength of an upstream default
    // that a major version could widen without anybody here noticing. The server it fronts pins the
    // same address for the same reason.
    host: "127.0.0.1",

    // Opens the tab, which is the point — `npm run dev` should match `npm start`. Not a default.
    open: true,

    // The API is the other server. Proxied rather than CORS'd, so the app makes same-origin requests
    // and the production path — where one server does both — needs no different code.
    proxy: [{ context: ["/api", "/rev"], target: API }],
  },
};
