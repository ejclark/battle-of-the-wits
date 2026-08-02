#!/usr/bin/env node
// harness-map — write the dungeon map to a self-contained HTML file.
//
//   harness-map                 # writes dungeon-map.html in the repo root
//   harness-map -o path.html    # writes somewhere else
//
// Standalone output: no external stylesheet, font, or script, so it opens from disk and renders
// under a strict CSP. A READ surface — regenerate any time; every element is derived from state.
import { mapDocument } from "./cartography.mjs";
import { writeViewCli } from "./render.mjs";

writeViewCli(process.argv.slice(2), "dungeon-map.html", mapDocument, "dungeon map");
