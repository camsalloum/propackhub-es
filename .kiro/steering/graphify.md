---
inclusion: always
---

# Estimation Studio (ES) knowledge graph — agent memory

ES is the ProPackHub costing / estimation app (packages: `engine`, `server`, `web`).
A graphify code-structure graph lives at `graphify-out/graph.json`.

For any codebase, architecture, or dependency question, query the graph before
grepping or reading whole files — it returns a small scoped subgraph and saves context:

```bash
graphify query   "<question>"     # e.g. "how is a costing estimate calculated"
graphify path    "<A>" "<B>"      # shortest dependency path between two symbols
graphify explain "<symbol>"       # a symbol and its neighbours
graphify affected "<symbol>"      # what breaks if you change this
```

Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.

Refresh after code changes (code-only, no LLM): run `graphify update packages/<pkg>/src`
for each changed package, then re-merge the three package graphs with
`graphify merge-graphs ... --out graphify-out/graph.json`.

## Mapping docs / PDFs / Excel — use the IDE agent, not an API key

The graph above is code-only (AST, no LLM). To also map document meaning, do NOT set
an API key. Run `/graphify <folder>` inside the IDE (Kiro / Cursor / Copilot) — it
uses the IDE's own built-in agent as the LLM. No key, no quota.
