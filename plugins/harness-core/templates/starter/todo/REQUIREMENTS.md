# What this does, written so a test can check it

These are **EARS** requirements — Easy Approach to Requirements Syntax. The whole trick is that every
one follows a fixed shape, and the shape forces you to say the two things people leave out: *when*
does this apply, and *what exactly* has to be true afterwards.

Compare:

> ~~Users should be able to edit their tasks.~~

Nobody can build the wrong thing from that, because nobody can build anything from it. What happens
to a blank edit? Does the item keep its place? Is it still the same item?

Each line below maps to a test in `tests/todo.test.mjs`. That mapping is the point — **a requirement
nothing checks is a wish**, and a test with no requirement behind it is a guess about what mattered.

---

**R1 · Ubiquitous** — The system shall keep every to-do item's text and whether it is done.

**R2 · Event-driven** — When the user submits text that is not blank, the system shall add a new item
with that text, marked not done.

**R3 · Unwanted behaviour** — If the submitted text is blank or only spaces, then the system shall
leave the list unchanged.

**R4 · Event-driven** — When the user deletes an item, the system shall remove that item and leave
every other item in place.

**R5 · Unwanted behaviour** — If the item to delete does not exist, then the system shall leave the
list unchanged.

**R6 · Event-driven** — When the user edits an item to non-blank text, the system shall change that
item's text and keep its identity and position.

**R7 · Unwanted behaviour** — If an edit would set the text to blank, then the system shall leave the
list unchanged.

**R8 · Event-driven** — When the user ticks an item, the system shall mark it done without removing
it.

**R9 · Ubiquitous** — The system shall not modify a list it was given; every change produces a new
list.

---

**Notice how many are "unwanted behaviour".** Four of nine, and they are the ones a person would
never test by hand — nobody clicks Add on an empty box to see what happens. That is exactly why they
are written down, and why they are the cases most likely to be broken by a change six months from
now.

Adding a feature? Write its line here first, then the test, then the code. Doing it in that order
once will show you why: **you find out what you actually meant while writing the requirement**, which
is much cheaper than finding out while writing the code.
