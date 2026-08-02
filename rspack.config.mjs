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
// NO BABEL, NO LOADERS TO SPEAK OF. rspack's builtin SWC handles the JSX-free modern JS here, and a
// toolchain that needs a chain of transforms is one nobody can debug at 6pm.
import { rspack } from "@rspack/core";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// The API server's port. The UI is on 4173 — the address people already have — and the data server
// moves to 4174, so the URL nobody has to relearn is the one that still works.
const API = process.env.HARNESS_API ?? "http://127.0.0.1:4174";

export default {
  context: HERE,
  entry: { main: "./web/main.js" },
  output: {
    path: resolve(HERE, "web/dist"),
    filename: "[name].js",
    clean: true,
  },
  resolve: { extensions: [".js"] },
  module: {
    rules: [
      // CSS goes through rspack's own pipeline so editing a token hot-swaps the stylesheet instead
      // of reloading the page — which is the difference between adjusting a colour and losing your
      // scroll position twenty times in a row.
      { test: /\.css$/, type: "css" },
    ],
  },
  experiments: { css: true },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: "./web/index.html",
      title: "harness",
    }),
  ],
  devServer: {
    port: 4173,
    host: "127.0.0.1", //  same rule as the server it fronts — a repo map is nobody else's business
    hot: true,
    open: true, //  the tab opens itself here too, so `npm run dev` matches `npm start`
    client: { overlay: { errors: true, warnings: false } },
    // The API is the other server. Proxied rather than CORS'd, so the app makes same-origin requests
    // and the production path — where one server does both — needs no different code.
    proxy: [{ context: ["/api", "/rev"], target: API, changeOrigin: false }],
  },
  devtool: "source-map",
  stats: { preset: "errors-warnings", timings: true },
};
