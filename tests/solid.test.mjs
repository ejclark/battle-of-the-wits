import assert from "node:assert/strict";
import { test } from "node:test";
import {
  centroid,
  drum,
  faceNormal,
  facingCamera,
  makeCamera,
  orientOutward,
  paintOrder,
  quadPoint,
  ringPoints,
  shadeFace,
  svgFace,
  v3cross,
  v3dot,
  v3norm,
} from "../plugins/harness-core/lib/solid.mjs";

// The 3D kernel, tested as MATHS rather than as pictures. Nothing here stages a repository, because
// nothing here knows what one is — that separation is the reason a renderer this small can be
// checked at all, and it is the same separation the ladder rests on one level up: geometry is
// plumbing, "what a big file is" is a conclusion, and they live in different files.
//
// The cases are chosen for the failures that are SILENT. A back-face that is drawn anyway, a normal
// that came back NaN, a painter's sort that runs near-to-far — none of those throw, none fail a
// smoke test that only asks whether an SVG came out, and each produces a picture that is confidently
// wrong. A test that asserts "it rendered" would pass through every one of them.

const UNIT_CUBE_BOTTOM = [
  [-1, 0, -1],
  [1, 0, -1],
  [1, 0, 1],
  [-1, 0, 1],
];

test("a unit vector stays unit, and the zero vector does not become NaN", () => {
  const n = v3norm([3, 0, 4]);
  assert.equal(Math.round(Math.hypot(...n) * 1e6) / 1e6, 1);
  // The degenerate case is real: a tier of zero height makes a collinear face. A NaN normal would
  // propagate into culling and sorting and be wrong quietly, rather than loudly.
  assert.deepEqual(v3norm([0, 0, 0]), [0, 0, 0]);
  assert.ok(v3norm([0, 0, 0]).every(Number.isFinite));
});

test("a face's normal is perpendicular to the face, whatever its winding", () => {
  const n = faceNormal(UNIT_CUBE_BOTTOM);
  // Perpendicularity is the PROPERTY; which way it points is the winding's business and is asserted
  // separately. Checking it against two independent edges is what makes this a claim about the
  // plane rather than about one edge pair.
  for (const [a, b] of [
    [UNIT_CUBE_BOTTOM[0], UNIT_CUBE_BOTTOM[1]],
    [UNIT_CUBE_BOTTOM[1], UNIT_CUBE_BOTTOM[2]],
  ]) {
    const edge = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    assert.ok(Math.abs(v3dot(n, edge)) < 1e-9, "the normal must be perpendicular to every edge");
  }
});

test("Newell's method survives a non-planar quad, which the first-two-edges shortcut does not", () => {
  // A tapered drum's side is a trapezoid whose corners drift out of plane. The shortcut on a
  // near-degenerate first edge points anywhere at all; this must still give a usable direction.
  const skew = [
    [-1, 0, -1],
    [1, 0, -1],
    [0.9, 2, 1],
    [-1.1, 2, 1.05],
  ];
  const n = faceNormal(skew);
  assert.ok(n.every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-9, "and it must still be normalised");
});

test("orienting against an interior point makes the normal point out, from either winding", () => {
  // THE FAILURE THIS PREVENTS: a ring generated with the angle running the other way produces a
  // solid whose faces all point inward, culling removes exactly the faces that should have been
  // drawn, and the result is a hollow shell that still looks plausible from one angle.
  const inside = [0, -1, 0];
  for (const face of [UNIT_CUBE_BOTTOM, [...UNIT_CUBE_BOTTOM].reverse()]) {
    const out = orientOutward(face, inside);
    assert.ok(v3dot(faceNormal(out), [0, 1, 0]) > 0, "outward from a point below is upward");
  }
});

test("every face of a generated drum points away from its axis", () => {
  const { sides, cap } = drum(ringPoints([0, 0, 0], 5, 0, 8), ringPoints([0, 0, 0], 3, 10, 8));
  for (const face of sides) {
    const c = centroid(face);
    const outward = v3norm([c[0], 0, c[2]]); // radially out from the axis, at that height
    assert.ok(v3dot(faceNormal(face), outward) > 0, "a wall must face away from the axis it wraps");
  }
  assert.ok(v3dot(faceNormal(cap), [0, 1, 0]) > 0, "and the lid must face the sky");
});

test("a ring lies on its circle, at its height", () => {
  const ring = ringPoints([2, 0, -3], 4, 7, 9);
  assert.equal(ring.length, 9);
  for (const p of ring) {
    assert.equal(p[1], 7);
    assert.ok(Math.abs(Math.hypot(p[0] - 2, p[2] + 3) - 4) < 1e-9);
  }
});

test("perspective converges — the same object is smaller further away", () => {
  // The whole reason this rung is not isometric. If this ever stopped being true the picture would
  // still render, and would silently become rung two with a different palette.
  const camera = makeCamera({ eye: [0, 0, 100], target: [0, 0, 0], width: 400, height: 400 });
  const near = camera.project([10, 0, 0]).x - camera.project([0, 0, 0]).x;
  const far = camera.project([10, 0, -200]).x - camera.project([0, 0, -200]).x;
  assert.ok(far < near, "a span further from the camera must project narrower");
  assert.ok(far > 0, "…but it must not invert");
});

test("a point behind the camera is reported, not wrapped into the frame", () => {
  // Dividing by a negative depth mirrors the point through the origin and draws a polygon across
  // the whole page — a failure that reads as a rendering bug rather than as a bad camera.
  const camera = makeCamera({ eye: [0, 0, 100], target: [0, 0, 0], width: 400, height: 400 });
  assert.equal(camera.project([0, 0, 0]).behind, false);
  assert.equal(camera.project([0, 0, 400]).behind, true);
});

test("the painter's order is far to near", () => {
  const eye = [0, 0, 100];
  const faceAt = (z) => ({ points: [[-1, 0, z], [1, 0, z], [1, 1, z], [-1, 1, z]] });
  const ordered = paintOrder([faceAt(50), faceAt(-90), faceAt(0)], eye);
  const depths = ordered.map((f) => centroid(f.points)[2]);
  assert.deepEqual(depths, [-90, 0, 50], "nearer faces must be painted last, over the ones behind");
});

test("culling keeps the faces turned toward the camera and drops the rest", () => {
  const eye = [0, 0, 100];
  const front = { points: orientOutward(UNIT_CUBE_BOTTOM.map(([x, , z]) => [x, z, 10]), [0, 0, 0]) };
  const back = { points: [...front.points].reverse() };
  const kept = facingCamera([front, back], eye);
  assert.equal(kept.length, 1, "exactly one of a face and its reverse can face the camera");
  assert.equal(kept[0], front);
});

test("shading responds to the light, and never renders a surface as a hole", () => {
  const up = UNIT_CUBE_BOTTOM; // normal is +Y once oriented from below
  const face = orientOutward(up, [0, -1, 0]);
  const facing = shadeFace(face, [0, 1, 0]);
  const edgeOn = shadeFace(face, [1, 0, 0]);
  const away = shadeFace(face, [0, -1, 0]);
  assert.ok(facing > edgeOn && edgeOn >= away, "more light where the surface faces the light");
  assert.ok(away > 0, "a pure Lambert term with no ambient renders an away-facing surface as a black hole");
  assert.ok(facing <= 1);
});

test("a point in a quad's own coordinates lands where the quad's corners are", () => {
  const quad = [
    [0, 0, 0],
    [10, 0, 0],
    [10, 4, 0],
    [0, 4, 0],
  ];
  assert.deepEqual(quadPoint(quad, 0, 0), [0, 0, 0]);
  assert.deepEqual(quadPoint(quad, 1, 1), [10, 4, 0]);
  assert.deepEqual(quadPoint(quad, 0.5, 0.5), [5, 2, 0]);
  // And it stays ON the surface — this is the whole reason window slots are expressed this way
  // rather than recomputed from the tier's radius and angle.
  const skew = [
    [0, 0, 0],
    [10, 0, 0],
    [8, 6, 0],
    [1, 6, 0],
  ];
  assert.equal(quadPoint(skew, 0.37, 0.62)[2], 0);
});

test("a projected polygon is a polygon — enough points, and all of them finite", () => {
  const camera = makeCamera({ eye: [0, 0, 60], target: [0, 0, 0], width: 200, height: 200 });
  const svg = svgFace(UNIT_CUBE_BOTTOM, camera, ' class="probe"');
  const points = svg.match(/points="([^"]+)"/)[1].split(" ");
  assert.equal(points.length, 4);
  for (const p of points) {
    const [x, y] = p.split(",").map(Number);
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `NaN in the point list: ${p}`);
  }
  assert.match(svg, /class="probe"/, "the caller's attributes have to survive");
});

test("the cross product is right-handed, which everything above quietly assumes", () => {
  assert.deepEqual(v3cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
});
