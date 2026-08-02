// THE LOGIC, WITH NO REACT IN IT — and that is the one decision in this project worth copying.
//
// Nothing here imports React, touches the DOM, or knows a component exists. That is why its tests
// are three lines each and need no browser, and the thing that decides whether you write a second
// test is whether the first one was easy.
//
// The habit generalises: when something is hard to test, it is usually because a decision got mixed
// into the drawing. Pull the decision out and both halves get simpler.

/** The list, with `text` added to the end. Blank input changes nothing. */
export function add(list, text) {
  const clean = text.trim();
  return clean ? [...list, clean] : list;
}

/** The list, without the item at `index`. */
export function remove(list, index) {
  return list.filter((_, i) => i !== index);
}

/**
 * A greeting for `name`, and a general one when there is no name yet.
 *
 * Returning something for the empty case rather than nothing is deliberate: a component that has to
 * decide what "no greeting" looks like has been handed a decision that belongs here.
 */
export function greet(name) {
  const clean = name.trim();
  return clean ? `Hello, ${clean}.` : "Hello. What is your name?";
}
