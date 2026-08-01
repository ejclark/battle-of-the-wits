# Cannot think of anything? Answer five questions instead.

This is not a warm-up. **The answers are the input** — the page draws itself from your five words,
and nobody else's page will look like yours.

Answer fast. First thing that comes to mind is the correct answer; there is no second-guessing to do
because none of these have a right one.

1. **A place you would rather be right now.** One word. *(sets the mood of the whole thing)*
2. **Pick a number between three and ten** — say it as a word: `four`, `seven`. *(that many bands)*
3. **How does today feel?** One word. `restless`, `flat`, `electric`, `fine`. *(how wavy it gets)*
4. **A colour, or something that has a colour.** `copper`, `moss`, `plum`, `your dog's name`.
5. **A time of day.** `midnight`, `noon`, `4am`. *(anything nightish turns the lights down)*

Now open `art.mjs` and put your five answers in the list at the top:

```js
export const WORDS = ["harbour", "four", "restless", "moss", "4am"];
```

Reload. **That picture did not exist before you answered.**

---

### Why this works when "think of a project" does not

Asking someone to invent a project asks them to do the hardest part first, with nothing to react to.
Asking five silly questions produces raw material in thirty seconds, and **material is much easier to
argue with than a blank page.** You will look at the picture and immediately want it different — and
*that* is the thing that was missing, not motivation.

### Then keep pulling

Every one of these is a real change and each is bigger than the last:

- **Change one word** and reload. Which word did what? You just read code by experiment.
- **Add a sixth word** and make it do something — the mark's position, another band, anything.
- **Put the questions on the page**, so a visitor answers them and gets their own picture. That is a
  real feature and you now know where every piece of it goes.
- **Save the answers**, so it remembers. That is `localStorage`, and it is four lines.

Somewhere in there you will stop asking what to build next, because you will already be annoyed by
something. **That annoyance is the whole point** — and it is the same loop this project runs on, all
the way up.
