// WHAT COUNTS AS A DEFINITION — the precision half of the duplication gate.
//
// The gate's signal is "the same top-level name declared in N files", used as a cheap, high-recall
// proxy for "the same implementation pasted N times". After the descriptor preamble was consolidated
// into one module, the proxy started reporting the consolidation itself: six scanners each write
//
//     const DESC = descriptor(ROOT);
//     const budget = readBudget(ROOT, "arch", {});
//     const rel = (f) => relTo(ROOT, f);
//
// Those are BINDINGS, not definitions. The implementation lives in exactly one place — which is what
// DRY asks for — and the local name is how each caller reaches it. Counting them as debt punishes the
// fix, and the tempting response is the wrong one: renaming twenty symbols across six files to
// satisfy a counter is the gate distorting the codebase, which this repository has already banked
// once as a lesson.
//
// So the rule is narrowed, and narrowed in a way that CANNOT excuse a real copy: a `const` whose
// initializer's only call is to a symbol **imported into that same file** is a binding. Paste a
// function body and its initializer is not an imported call — it is the body. `function` and `class`
// declarations are always definitions, no exceptions, because that is where pasted code actually
// lives.
//
// This is deliberately not a suppression list. A list is a claim about names; this is a claim about
// structure, checkable from the source, and it stops applying the moment the code stops being a
// binding.

/** Every name this file imports — named, default, or namespace. */
export function importedNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/^import\s+([^;]+?)\s+from\s+["'][^"']+["']/gm)) {
    const clause = m[1];
    for (const braced of clause.matchAll(/\{([^}]*)\}/g)) {
      for (const part of braced[1].split(",")) {
        const local = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (local) names.add(local);
      }
    }
    // default and namespace imports, e.g. `import x from` / `import * as ns from`
    const bare = clause.replace(/\{[^}]*\}/g, "").replace(/^\s*,|,\s*$/g, "").trim();
    const ns = bare.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
    if (ns) names.add(ns[1]);
    else if (/^[A-Za-z_$][\w$]*$/.test(bare)) names.add(bare);
  }
  return names;
}

const DEF_RE = /^(?:export\s+)?(?:async\s+)?(function|const|class)\s+([A-Za-z_$][\w$]*)([^\n]*)$/gm;

/**
 * The top-level names a source file DEFINES, excluding bindings of imported symbols.
 *
 * @param {string} src  file contents
 * @returns {string[]}  names that represent an implementation living in this file
 */
export function definedNames(src) {
  const imported = importedNames(src);
  const out = [];
  for (const m of src.matchAll(DEF_RE)) {
    const [, kind, name, tail] = m;
    if (kind === "const" && isBinding(tail, imported)) continue;
    out.push(name);
  }
  return out;
}

/**
 * Is this `const`'s initializer just reaching for something imported?
 *
 * Two shapes count, and only these two:
 *   · a direct call or reference — `= descriptor(ROOT)`, `= shared`
 *   · a thin adapter that calls exactly one imported symbol and nothing else —
 *     `= (f) => relTo(ROOT, f)`
 *
 * An arrow that calls more than one function, or calls something local, is doing work of its own and
 * is counted. That is the line: reaching for one imported thing is a binding; composing behaviour is
 * an implementation.
 */
function isBinding(tail, imported) {
  const rhs = tail.replace(/^\s*=\s*/, "").replace(/;\s*$/, "").trim();
  if (!rhs || !/^=/.test(tail.trim())) return false;

  const direct = rhs.match(/^([A-Za-z_$][\w$]*)\s*[(.]?/);
  if (direct && imported.has(direct[1])) return true;

  // `(args) => <expr>` — accept only when the body's single call target is imported.
  const arrow = rhs.match(/^\(?[^)]*\)?\s*=>\s*(.+)$/);
  if (!arrow) return false;
  const calls = [...arrow[1].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((c) => c[1]);
  return calls.length === 1 && imported.has(calls[0]);
}
