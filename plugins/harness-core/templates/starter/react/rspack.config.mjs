// THE BUILD, and every line here is a deviation from a default that has to earn its place.
//
// Same rule the harness holds itself to: a config option that merely restates a default is worse
// than absent — it reads as a considered choice, so the next person leaves it alone, and it
// silently pins behaviour when the tool improves underneath. Everything rspack already does is
// missing from this file on purpose.
import { rspack } from "@rspack/core";

export default {
  entry: { main: "./src/main.jsx" },

  // `"..."` KEEPS THE DEFAULTS and adds .jsx to them. Writing the list out instead would NARROW
  // resolution — the harness's own config had exactly that bug, and it would have broken the first
  // plain `.js` import anybody added.
  resolve: { extensions: ["...", ".jsx"] },

  module: {
    rules: [
      // JSX is not JavaScript, so something has to translate it. swc ships inside rspack, which is
      // why this project needs no Babel and no extra dependency to read the component files.
      {
        test: /\.jsx$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "ecmascript", jsx: true },
              // "automatic" is why App.jsx never writes `import React` — the runtime is inserted for
              // you. Every tutorial older than 2021 will tell you otherwise; they predate this.
              //
              // NO `refresh: true`. It makes swc emit Fast Refresh calls ($RefreshSig$) that only
              // exist if @rspack/plugin-react-refresh and react-refresh are installed and wired —
              // and without them the page renders BLANK with one console error, which is the worst
              // possible first five minutes. Saving a file reloads the page instead. Slower by a
              // few hundred milliseconds, and it works from the first command.
              transform: { react: { runtime: "automatic", development: true } },
            },
          },
        },
      },
      { test: /\.css$/, type: "css" },
    ],
  },

  // Both of these are required for a plain `.css` import to resolve — verified by removing them.
  experiments: { css: true },

  plugins: [new rspack.HtmlRspackPlugin({ template: "./index.html" })],

  devServer: {
    // Opens the tab, which is the point: `npm run dev` should end at a page, not at an address you
    // have to copy. The one thing this project is trying to make happen is you seeing your change.
    open: true,
    port: 3000,
  },
};
