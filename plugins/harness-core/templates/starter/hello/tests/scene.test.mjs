// Four tests, and the reason they exist is worth more than the tests.
//
// A picture generated from words looks like magic, and magic is untestable. These say it is not
// magic: the same words always give the same answer, "seven" really does mean seven, and a word
// nobody anticipated still produces something valid rather than a crash.
//
// That last one is the case a person would never try by hand — and it is the one that breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { paletteFor, sceneFrom, seed } from "../scene.mjs";

const WORDS = ["ocean", "seven", "restless", "copper", "midnight"];

test("the same words always draw the same picture", () => {
  assert.deepEqual(sceneFrom(WORDS), sceneFrom(WORDS));
  assert.equal(seed("ocean"), seed("ocean"));
  assert.notEqual(seed("ocean"), seed("oceans"), "one letter has to change the result, or it is not reading the word");
});

test("a number word means that number of bands", () => {
  assert.equal(sceneFrom(["a", "seven", "c", "d", "e"]).count, 7);
  assert.equal(sceneFrom(["a", "three", "c", "d", "e"]).count, 3);
});

test("a word nobody planned for still works", () => {
  // The case that breaks things: somebody types "wombat" where a number was expected. It must
  // produce a real picture, not a crash and not an empty one.
  const scene = sceneFrom(["wombat", "wombat", "wombat", "wombat", "wombat"]);
  assert.ok(scene.count >= 3 && scene.count <= 10, `count out of range: ${scene.count}`);
  assert.ok(Number.isFinite(scene.amplitude) && scene.amplitude > 0);
  assert.ok(scene.focusX > 0 && scene.focusX < 1, "the mark has to land on the canvas");
});

test("colours are real colours, and night words make it dark", () => {
  const day = paletteFor(["a", "b", "c", "copper", "noon"]);
  const night = paletteFor(["a", "b", "c", "copper", "midnight"]);
  assert.equal(night.night, true);
  assert.equal(day.night, false);
  for (const c of [...day.bands, day.sky, day.mark]) {
    assert.match(c, /^hsl\(\d+(\.\d+)? \d+% \d+%\)$/, `not a valid colour: ${c}`);
  }
});
