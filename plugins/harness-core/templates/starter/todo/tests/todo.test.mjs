// Your first test file. Read one case and you have read them all.
//
// Each one does the same three things: build a situation, run the function, check what came back.
// Arrange, act, assert — that is the entire pattern, and every test you ever write is a variation
// on it.
//
// The cases that matter most here are the ones checking what happens when something is WRONG:
// blank text, an id that does not exist. Those are the ones a person would never think to try by
// hand, and they are exactly what turns a suite from decoration into a net.
import { test } from "node:test";
import assert from "node:assert/strict";
import { add, edit, remove, toggle } from "../src/todo.mjs";

test("a user can create a to-do item", () => {
  const items = add([], "buy milk");
  assert.equal(items.length, 1);
  assert.equal(items[0].text, "buy milk");
  assert.equal(items[0].done, false, "a new item starts unfinished");
});

test("creating ignores blank text rather than adding an empty row", () => {
  assert.deepEqual(add([], ""), []);
  assert.deepEqual(add([], "   "), [], "spaces are blank too — this is the one people forget");
});

test("a user can delete a to-do item", () => {
  const items = add(add([], "one"), "two");
  const after = remove(items, items[0].id);
  assert.equal(after.length, 1);
  assert.equal(after[0].text, "two", "the RIGHT one has to survive, not just one of them");
});

test("deleting something that is not there changes nothing", () => {
  const items = add([], "one");
  assert.deepEqual(remove(items, 999), items);
});

test("a user can edit a to-do item", () => {
  const items = add([], "by milk");
  const after = edit(items, items[0].id, "buy milk");
  assert.equal(after[0].text, "buy milk");
  assert.equal(after[0].id, items[0].id, "editing text must not change which item it is");
});

test("editing to blank is refused, so a typo cannot erase the item", () => {
  const items = add([], "buy milk");
  assert.deepEqual(edit(items, items[0].id, "  "), items);
});

test("ticking an item off does not delete it", () => {
  const items = add([], "buy milk");
  const after = toggle(items, items[0].id);
  assert.equal(after.length, 1);
  assert.equal(after[0].done, true);
});

test("every change leaves the original list alone", () => {
  // The property the whole design rests on. If any function above mutated its input, this fails —
  // and mutation bugs are the ones that show up as "it worked yesterday".
  const items = add([], "buy milk");
  const snapshot = JSON.parse(JSON.stringify(items));
  add(items, "and bread");
  remove(items, items[0].id);
  edit(items, items[0].id, "changed");
  toggle(items, items[0].id);
  assert.deepEqual(items, snapshot);
});
