// THE SOLID KERNEL — a real 3D renderer, small enough to read in one sitting.
//
// Rung three of the visual ladder needs actual geometry: points in space, a camera, a light. This
// file is that and nothing else. It knows no repository, no budget and no district — hand it faces
// and it hands back projected polygons, which is the whole reason it can be tested without staging a
// repo on disk.
//
// WHY A SOFTWARE RENDERER AND NOT WEBGL. The rungs below it make a promise the tests enforce:
// inline SVG, no script, no font, no remote asset — the file opens from disk, survives being
// emailed, and renders under a strict CSP. A canvas needs script, and a rung that quietly drops that
// promise is not a rung, it is a different product. So the projection happens in Node, at render
// time, and what lands in the page is a list of polygons. The geometry is genuinely three
// dimensional; only the rasteriser is missing, and the browser already has one.
//
// A face is an array of `[x, y, z]` points, wound so its outward side is the one that faces out.
// Y is up. Nothing here mutates its arguments.

/** Vector difference. */
export const v3sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Vector sum. */
export const v3add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Scalar multiple. */
export const v3scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/** Dot product. */
export const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Cross product. */
export const v3cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Unit vector, and `[0,0,0]` for the zero vector rather than `[NaN,NaN,NaN]`.
 *
 * The degenerate case is not hypothetical here: a tier of zero height produces a side face whose
 * points are collinear, and a NaN normal propagates silently into every downstream comparison —
 * culling stops working, the painter's sort becomes order-dependent, and the picture is subtly wrong
 * rather than obviously broken. Returning zero makes the face fail the visibility test instead, which
 * is the honest outcome: a face with no area has no outward side.
 */
export function v3norm(a) {
  const len = Math.hypot(a[0], a[1], a[2]);
  return len === 0 ? [0, 0, 0] : [a[0] / len, a[1] / len, a[2] / len];
}

/** The average of a face's points — its centroid, used for depth sorting and for orientation. */
export function centroid(face) {
  const sum = face.reduce((acc, p) => v3add(acc, p), [0, 0, 0]);
  return v3scale(sum, 1 / face.length);
}

/**
 * A polygon's normal by Newell's method, rather than the cross product of the first two edges.
 *
 * The textbook shortcut is correct only for a triangle. Every quad this renderer produces is close
 * to planar but not exactly — a tapered drum's side is a trapezoid whose corners drift once radii
 * differ — and the shortcut on a near-degenerate first edge gives a normal pointing anywhere at all.
 * Newell's sums over every edge, so it is stable for any polygon and reduces to the same answer for
 * a triangle.
 */
export function faceNormal(face) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < face.length; i++) {
    const a = face[i];
    const b = face[(i + 1) % face.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return v3norm([x, y, z]);
}

/**
 * Return the face wound so its normal points away from `inside`.
 *
 * Winding is the one part of building a solid that is easy to get silently wrong: a ring generated
 * with the angle running the other way produces faces whose normals all point inward, culling
 * removes exactly the faces that should have been drawn, and the result is a hollow shell that still
 * looks plausible from one angle. Rather than reason about the handedness of every generator, each
 * face is oriented against a point known to be inside the solid. That is checkable, and it is what
 * the spec checks.
 */
export function orientOutward(face, inside) {
  const n = faceNormal(face);
  return v3dot(n, v3sub(centroid(face), inside)) < 0 ? [...face].reverse() : face;
}

/**
 * A perspective camera, as a `project` function from world space to the SVG's coordinates.
 *
 * Perspective and not orthographic, deliberately, and it is the difference between rung two and rung
 * three: the city is isometric because a skyline is a comparison — equal things must measure equal
 * wherever they sit. A tower is a *single object seen from somewhere*, and convergence is what makes
 * a viewer read height rather than length. The trade is that this picture must never be used to
 * compare two tiers by their drawn width; the ledger below it carries the numbers, as it does on
 * every rung.
 *
 * `depth` travels with every projected point because the painter's algorithm needs it and because a
 * point behind the camera has to be detectable rather than wrapped around into the frame.
 */
export function makeCamera({ eye, target, up = [0, 1, 0], fov = Math.PI / 5, width, height }) {
  const forward = v3norm(v3sub(target, eye));
  const right = v3norm(v3cross(forward, up));
  const trueUp = v3cross(right, forward);
  const scale = height / 2 / Math.tan(fov / 2);

  return {
    eye,
    width,
    height,
    project(p) {
      const d = v3sub(p, eye);
      const depth = v3dot(d, forward);
      // Near-plane guard. Nothing in a tower scene should ever be behind the camera, but a projection
      // that divides by a negative depth mirrors the point through the origin and draws a polygon
      // across the whole page — a failure that looks like a rendering bug rather than a bad camera.
      if (depth <= 1e-6) return { x: 0, y: 0, depth: 0, behind: true };
      return {
        x: width / 2 + (v3dot(d, right) * scale) / depth,
        y: height / 2 - (v3dot(d, trueUp) * scale) / depth,
        depth,
        behind: false,
      };
    },
  };
}

/** Faces whose outward side is turned toward the camera. The other half of a solid is never drawn. */
export function facingCamera(faces, eye) {
  return faces.filter((f) => v3dot(faceNormal(f.points), v3sub(eye, centroid(f.points))) > 0);
}

/**
 * Far to near, so nearer faces are painted over the ones behind them.
 *
 * The painter's algorithm, which is all a convex solid needs and is what the isometric rung below
 * already uses — stated here rather than inherited, because the moment two tiers interpenetrate this
 * becomes wrong and the fix is a depth buffer, not a different sort.
 */
export function paintOrder(faces, eye) {
  const away = (f) => {
    const d = v3sub(centroid(f.points), eye);
    return v3dot(d, d); // squared distance — the square root would not change the ordering
  };
  return [...faces].sort((a, b) => away(b) - away(a));
}

/**
 * Lambert shading, floored at an ambient term.
 *
 * Returns an opacity rather than a colour, and that is what keeps the picture themeable: the fill
 * comes from a CSS variable, the light comes from the geometry, and the page still answers to
 * `prefers-color-scheme` without the renderer knowing a single hex value. A pure Lambert term with
 * no ambient renders every away-facing surface as a black hole, which reads as a missing polygon.
 */
export function shadeFace(face, light, { ambient = 0.42 } = {}) {
  const lit = Math.max(0, v3dot(faceNormal(face), v3norm(light)));
  return Math.round((ambient + (1 - ambient) * lit) * 1000) / 1000;
}

/** A ring of points on a horizontal circle — the primitive every drum in the tower is built from. */
export function ringPoints(centre, radius, y, sides, phase = 0) {
  return Array.from({ length: sides }, (_, i) => {
    const t = phase + (i / sides) * Math.PI * 2;
    return [centre[0] + Math.cos(t) * radius, y, centre[2] + Math.sin(t) * radius];
  });
}

/**
 * A drum: the side quads between two rings, plus the top cap, every face already oriented outward.
 *
 * The two rings may differ in radius, which is how the tower tapers, and the cap is returned
 * separately because a tier with another tier stacked on it should not draw a lid nobody can see.
 */
export function drum(lower, upper) {
  const inside = centroid([...lower, ...upper]);
  const sides = lower.map((p, i) => {
    const j = (i + 1) % lower.length;
    return orientOutward([lower[i], lower[j], upper[j], upper[i]], inside);
  });
  return { sides, cap: orientOutward([...upper], inside) };
}

/**
 * A point inside a quad, in the quad's own `(u, v)` coordinates — `[p0, p1, p2, p3]` wound so `u`
 * runs p0→p1 along the bottom and `v` runs p0→p3 up the side.
 *
 * This is how anything gets drawn ON a surface rather than floating near it: a window slot is a
 * small quad at fixed `(u, v)` of the wall it belongs to, so it stays welded to the wall under any
 * camera, taper or rotation. The alternative — computing the slot in world space from the tier's
 * radius and angle — reimplements the wall's own geometry a second time and drifts from it the first
 * time a tier tapers.
 */
export function quadPoint(quad, u, v) {
  const bottom = v3add(v3scale(quad[0], 1 - u), v3scale(quad[1], u));
  const top = v3add(v3scale(quad[3], 1 - u), v3scale(quad[2], u));
  return v3add(v3scale(bottom, 1 - v), v3scale(top, v));
}

/** One projected polygon. Points are rounded — a tenth of a pixel is invisible and doubles the file. */
export function svgFace(points, camera, attrs = "") {
  const pts = points
    .map((p) => camera.project(p))
    .map((s) => `${Math.round(s.x * 10) / 10},${Math.round(s.y * 10) / 10}`)
    .join(" ");
  return `<polygon points="${pts}"${attrs}/>`;
}
