#!/usr/bin/env node
// harness-city — write the isometric city to a self-contained HTML file.
//
//   harness-city                 # writes city.html in the repo root
//   harness-city -o path.html    # writes somewhere else
//
// Rung two of the visual ladder. Rung one (`harness-map`) shows what has been DECIDED; this shows
// where the WEIGHT is. Both read the same derived model, so they cannot disagree about the repo.
import { cityDocument } from "./city.mjs";
import { writeViewCli } from "./render.mjs";

writeViewCli(process.argv.slice(2), "city.html", cityDocument, "city");
