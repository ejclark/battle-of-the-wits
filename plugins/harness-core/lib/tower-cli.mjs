#!/usr/bin/env node
// harness-tower — write the watchtower to a self-contained HTML file.
//
//   harness-tower                 # writes tower.html in the repo root
//   harness-tower -o path.html    # writes somewhere else
//
// Rung three of the visual ladder. Rung one (`harness-map`) shows what has been DECIDED, rung two
// (`harness-city`) shows where the WEIGHT is, and this shows what is WATCHING — how many of the six
// dimensions are measured, drawn as an aperture rather than reported as a ratio. All three read the
// same derived model, so they cannot disagree about the repository.
import { writeViewCli } from "./render.mjs";
import { towerDocument } from "./tower.mjs";

writeViewCli(process.argv.slice(2), "tower.html", towerDocument, "tower");
