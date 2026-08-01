// The rules that turn words into a picture. No DOM in here, on purpose — which is why the tests
// beside it need no browser, and why you can check that "seven" really does produce seven bands
// without ever opening the page.
//
// That separation is the single most useful habit in this whole starter: the part that DECIDES lives
// apart from the part that DRAWS.

/** A stable number for any word. Same word in, same number out, forever. */
export function seed(word) {
  let n = 0;
  for (const ch of String(word)) n = (n * 31 + ch.codePointAt(0)) % 100000;
  return n;
}

const NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** Shape of the scene: how many bands, how wavy, how tall, where the mark sits. */
export function sceneFrom(words) {
  const [subject, quantity, mood, , time] = words.map((w) => String(w).toLowerCase());
  const count = NUMBERS[quantity] ?? (seed(quantity) % 8) + 3;
  return {
    count,
    waves: 1 + (seed(mood) % 5),
    amplitude: 6 + (seed(subject) % 26),
    focusX: 0.2 + ((seed(time) % 60) / 100),
    focusR: 14 + (seed(mood) % 30),
  };
}

/** Colours. A word that names one is used; anything else is turned into a hue by its own letters. */
const NAMED = { copper: 24, ocean: 205, rose: 340, moss: 130, ink: 230, gold: 45, plum: 290 };

export function paletteFor(words) {
  const [subject, , mood, colour, time] = words.map((w) => String(w).toLowerCase());
  const hue = NAMED[colour] ?? seed(colour) % 360;
  const night = /night|dusk|dark|midnight|evening/.test(time);
  return {
    sky: `hsl(${(hue + 180) % 360} ${night ? 30 : 55}% ${night ? 12 : 88}%)`,
    mark: `hsl(${hue} 70% ${night ? 72 : 52}%)`,
    bands: Array.from({ length: 5 }, (_, i) => `hsl(${(hue + i * 12) % 360} ${45 + (seed(mood) % 25)}% ${(night ? 22 : 62) + i * 6}%)`),
    night,
    subjectHue: seed(subject) % 360,
  };
}
