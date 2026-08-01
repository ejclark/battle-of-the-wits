// The wiring, and the ONLY file that knows a browser exists.
//
// Every rule about what a to-do list does lives in `todo.mjs`, which is why that file's tests need
// no browser, no DOM and no setup. This file just moves data between there and the screen. Keeping
// that line clean is what makes the logic testable — and it is the single most useful habit in here.
import { add, edit, remove, toggle } from "./todo.mjs";

let items = load();

const list = document.getElementById("list");
const what = document.getElementById("what");

document.getElementById("new").addEventListener("submit", (e) => {
  e.preventDefault();
  update(add(items, what.value));
  what.value = "";
});

function update(next) {
  items = next;
  save(items);
  render();
}

function render() {
  list.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      if (item.done) li.className = "done";

      const tick = document.createElement("input");
      tick.type = "checkbox";
      tick.checked = item.done;
      tick.ariaLabel = `done: ${item.text}`;
      tick.addEventListener("change", () => update(toggle(items, item.id)));

      // Click the text to rename it. `prompt` is unglamorous and it is three lines — replacing it
      // with an inline editor is a good second feature, once the loop is familiar.
      const text = document.createElement("span");
      text.textContent = item.text;
      text.addEventListener("click", () => update(edit(items, item.id, prompt("Change it to:", item.text) ?? item.text)));

      const del = document.createElement("button");
      del.textContent = "×";
      del.ariaLabel = `delete: ${item.text}`;
      del.addEventListener("click", () => update(remove(items, item.id)));

      li.append(tick, text, del);
      return li;
    }),
  );
}

// Survives a reload. Corrupt storage is treated as an empty list rather than a crash — the browser's
// storage is not something this app controls, so it cannot assume it is well-formed.
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem("todo") ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
const save = (v) => {
  try {
    localStorage.setItem("todo", JSON.stringify(v));
  } catch {
    /* private mode, quota, a browser that says no — none of it is worth losing the app over */
  }
};

render();
