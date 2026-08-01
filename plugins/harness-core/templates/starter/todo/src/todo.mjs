// The whole application, and deliberately not an object or a class.
//
// Every function here takes a list and returns a NEW list. Nothing is mutated and nothing is stored,
// which is what makes the tests beside this file three lines each — there is no setup, because there
// is no state to set up.
//
// That is not a style preference. The first time somebody writes a test, the thing that decides
// whether they write a second one is whether the first was easy. A function that takes what it needs
// and returns what it produced is the easiest thing there is to check.

/** Add an item. Blank text is ignored — pressing Add on an empty box should do nothing, not crash. */
export function add(items, text) {
  const trimmed = String(text ?? "").trim();
  return trimmed ? [...items, { id: nextId(items), text: trimmed, done: false }] : items;
}

/** Remove one item by id. An id that is not there is not an error; the list simply does not change. */
export function remove(items, id) {
  return items.filter((i) => i.id !== id);
}

/** Change an item's text. Blank is refused, for the same reason `add` refuses it. */
export function edit(items, id, text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return items;
  return items.map((i) => (i.id === id ? { ...i, text: trimmed } : i));
}

/** Tick or un-tick. */
export function toggle(items, id) {
  return items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
}

// Ids come from the highest one already present rather than from a counter, so the function stays
// pure — a counter would be state, and state is what makes tests need setup.
const nextId = (items) => items.reduce((max, i) => Math.max(max, i.id), 0) + 1;
