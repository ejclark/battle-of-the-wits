// The tests, and they need no browser — because the rules they check have no React in them.
//
// Run them with `npm test`. They pass right now, before you have changed anything, and that is not
// a formality: it means the thing you are about to change is known-good, so anything that breaks
// next is something you did. That is the only way a test suite is ever actually useful.
//
// ADD ONE. Copy a block, change the words, change what you expect. If you cannot work out how to
// test something, that is usually the code telling you a decision is tangled up with the drawing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { add, greet, remove } from "../src/greeting.js";

test("a greeting uses your name once you have given one", () => {
  assert.equal(greet("Tony"), "Hello, Tony.");
});

test("and asks for it when you have not", () => {
  // The empty case is a real case. Code that only works once everything is filled in is code that
  // is broken every time somebody opens the page.
  assert.equal(greet(""), "Hello. What is your name?");
  assert.equal(greet("   "), "Hello. What is your name?", "spaces are not a name");
});

test("adding puts the thing on the end", () => {
  assert.deepEqual(add(["milk"], "bread"), ["milk", "bread"]);
});

test("adding nothing changes nothing", () => {
  const before = ["milk"];
  assert.deepEqual(add(before, "   "), ["milk"]);
});

test("adding does not damage the list you started with", () => {
  // React redraws when it sees a NEW list. Change the old one in place and the screen does not
  // update, which looks like a broken button and is really a broken habit.
  const before = ["milk"];
  add(before, "bread");
  assert.deepEqual(before, ["milk"], "add must return a new list, never edit the old one");
});

test("removing takes out the one you pointed at", () => {
  assert.deepEqual(remove(["a", "b", "c"], 1), ["a", "c"]);
});
