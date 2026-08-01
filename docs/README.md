# Docs

The portable doctrine **ships with the plugin** rather than living here, so an adopter gets it on
disk when they install `harness-core` — not as a link to a repository they may never open.

| Doctrine | Where it lives |
|---|---|
| [`COACHES.md`](../plugins/harness-core/docs/COACHES.md) | The detect-and-correct system: the coaching staff, the codification ladder, detection lag, the smell catalog |
| [`ENGINEERING.md`](../plugins/harness-core/docs/ENGINEERING.md) | Engineering standards, change communication, the BDD loop |
| [`OPERATING-MODEL.md`](../plugins/harness-core/docs/OPERATING-MODEL.md) | How a human and Claude divide the work |
| [`DESCRIPTOR.md`](../plugins/harness-core/docs/DESCRIPTOR.md) | `harness.json` — the interface that makes all of the above portable |

`docs/DESCRIPTOR.md` remains here as a convenience copy for readers browsing this repository on the
web; `plugins/harness-core/docs/DESCRIPTOR.md` is the one that ships. **Any other doctrine file
appearing in this directory is drift** — one source, or none.
