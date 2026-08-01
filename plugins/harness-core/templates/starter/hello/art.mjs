// A picture, drawn from five words.
//
// THIS IS THE POINT OF THE FILE: nothing here is random. The same five words always draw the same
// picture, and one different word draws a different one. So it is not a novelty — it is the shortest
// possible demonstration of the thing all software does, which is turn input into output by rules
// you can read.
//
// Change a word. Reload. The picture changes, and you can work out WHY by reading fifteen lines.
// That is a much better first encounter with code than a tutorial about variables.
import { paletteFor, sceneFrom } from "./scene.mjs";

// ── YOUR FIVE WORDS. Change any of them. ──────────────────────────────────────
export const WORDS = ["ocean", "seven", "restless", "copper", "midnight"];

const canvas = document.getElementById("art");
if (canvas) draw(canvas, WORDS);

export function draw(el, words) {
  const ctx = el.getContext("2d");
  const { w, h } = { w: el.width, h: el.height };
  const scene = sceneFrom(words);
  const palette = paletteFor(words);

  ctx.fillStyle = palette.sky;
  ctx.fillRect(0, 0, w, h);

  // Bands — how many comes from your second word, how wavy from your third.
  for (let i = 0; i < scene.count; i++) {
    ctx.beginPath();
    const y = h * (0.35 + (i / scene.count) * 0.6);
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, y + Math.sin((x / w) * scene.waves * Math.PI * 2 + i) * scene.amplitude);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = palette.bands[i % palette.bands.length];
    ctx.fill();
  }

  // One mark that is not a band, so the picture has somewhere to look.
  ctx.beginPath();
  ctx.arc(w * scene.focusX, h * 0.24, scene.focusR, 0, Math.PI * 2);
  ctx.fillStyle = palette.mark;
  ctx.fill();
}
