import assert from "node:assert/strict";
import { test } from "node:test";
import { definedNames, importedNames } from "../plugins/harness-gates/lib/definitions.mjs";

// The duplication gate's precision half. The danger of any refinement here is obvious: a rule that
// stops counting things can be talked into stopping counting the things that matter. So the cases
// below are split — a few prove the rule works, and the rest try to sneak a real pasted
// implementation past it.

test("named, default, namespace and aliased imports are all seen", () => {
  const src = `
import { a, b as c } from "./x.mjs";
import def from "./y.mjs";
import * as ns from "./z.mjs";
`;
  assert.deepEqual([...importedNames(src)].sort(), ["a", "c", "def", "ns"]);
});

test("a const bound to an imported call is not a definition", () => {
  const src = 'import { descriptor } from "./d.mjs";\nconst DESC = descriptor(ROOT);\n';
  assert.deepEqual(definedNames(src), []);
});

test("a thin arrow over one imported symbol is not a definition", () => {
  const src = 'import { relTo } from "./d.mjs";\nconst rel = (f) => relTo(ROOT, f);\n';
  assert.deepEqual(definedNames(src), []);
});

test("a bare re-binding of an imported name is not a definition", () => {
  const src = 'import { shared } from "./d.mjs";\nconst local = shared;\n';
  assert.deepEqual(definedNames(src), []);
});

// ── the adversarial half ────────────────────────────────────────────────────────────────────────

test("a pasted function body is always a definition", () => {
  const src = 'import { descriptor } from "./d.mjs";\nfunction lineCount(f) {\n  return 1;\n}\n';
  assert.deepEqual(definedNames(src), ["lineCount"]);
});

test("a pasted arrow implementation is a definition even with imports in the file", () => {
  const src = 'import { relTo } from "./d.mjs";\nconst lineCount = (f) => readFileSync(f).split("\\n").length;\n';
  assert.deepEqual(definedNames(src), ["lineCount"]);
});

test("an arrow that composes more than one call is doing work of its own", () => {
  // Reaching for one imported thing is a binding. Composing behaviour is an implementation, even
  // when every part of it happens to be imported.
  const src = 'import { a, b } from "./d.mjs";\nconst combo = (x) => a(b(x));\n';
  assert.deepEqual(definedNames(src), ["combo"]);
});

test("a const calling a LOCAL function is a definition", () => {
  const src = 'import { unrelated } from "./d.mjs";\nfunction helper() {}\nconst value = helper();\n';
  assert.deepEqual(definedNames(src), ["helper", "value"]);
});

test("a class is always a definition", () => {
  const src = 'import { Base } from "./d.mjs";\nclass Thing {}\n';
  assert.deepEqual(definedNames(src), ["Thing"]);
});

test("a const with a literal initializer is a definition", () => {
  const src = 'import { x } from "./d.mjs";\nconst LIMIT = 500;\n';
  assert.deepEqual(definedNames(src), ["LIMIT"]);
});

test("a file with no imports still reports every definition", () => {
  const src = "const a = 1;\nfunction b() {}\nexport const c = () => d();\n";
  assert.deepEqual(definedNames(src).sort(), ["a", "b", "c"]);
});

test("exported bindings are treated the same as unexported ones", () => {
  const src = 'import { descriptor } from "./d.mjs";\nexport const DESC = descriptor(ROOT);\n';
  assert.deepEqual(definedNames(src), []);
});
