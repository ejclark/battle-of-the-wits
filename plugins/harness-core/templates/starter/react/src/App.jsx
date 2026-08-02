// THE COMPONENT — everything you see, and nothing you have to reason about twice.
//
// It draws, and it holds what the page currently is. Every RULE lives in greeting.js, which has no
// React in it: what a greeting says, what adding to a list means. So this file stays readable as a
// picture of the page, and the rules stay testable without a browser.
//
// CHANGE SOMETHING. The heading, a colour in style.css, the words below. Save, and the browser
// updates without reloading — that loop, change and look, is the whole job.
import { useState } from "react";
import { add, greet, remove } from "./greeting.js";

export default function App() {
  // `useState` gives you a value and a way to change it. Change it, and React redraws — you never
  // update the page by hand.
  const [name, setName] = useState("");
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");

  return (
    <main>
      <h1>{greet(name)}</h1>

      <label>
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="type here" />
      </label>

      <p className="hint">Type your name above. The heading changes as you type — nothing had to tell it to.</p>

      <h2>A list, to prove it holds things</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault(); // …or the browser reloads the page and the list is gone
          setItems(add(items, draft));
          setDraft("");
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="add something" />
        <button type="submit">add</button>
      </form>

      <ul>
        {items.map((item, i) => (
          // The key tells React which row is which when the list changes. Without it, deleting the
          // first item can make the wrong row disappear.
          <li key={`${item}-${i}`}>
            {item}
            <button type="button" onClick={() => setItems(remove(items, i))} aria-label={`remove ${item}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="hint">Nothing yet. Add something above.</p>}
    </main>
  );
}
