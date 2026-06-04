# Owner Vis

A standalone Next.js + React Flow app for visualizing an ownership structure as
a graph. Add people and entities, drag from one to another to define a
percentage, and the graph computes inbound totals so you can spot incomplete
ownership (e.g. "this LLC only has 65% accounted for").

Single-user, local-only. Data is stored in a **local SQLite file** — no
accounts, no cloud, no API keys. Just clone and run.

## Setup

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/ownership`.

That's it. On first run the app creates a SQLite database at
`data/owner-vis.db` automatically. The `data/` folder is gitignored, so your
ownership data stays on your machine and is never committed.

> Requires Node.js 18+ (tested on Node 20). `npm install` compiles
> `better-sqlite3`, a native module — if you're on an unusual platform and the
> install fails, make sure you have build tools (`xcode-select --install` on
> macOS, `build-essential` on Linux).

## Using it

- **+ Person** / **+ Entity** — add a node. The node opens immediately for editing so you can name it and (for people) add an email.
- **Drag** from the bottom of one node to the top of another — creates an ownership edge. You'll be prompted for a percentage.
- **Click** a node to edit its name, type, or email.
- **Click** an edge to edit the percentage, or type "delete" to remove it.
- **Drag** nodes around to lay the graph out; positions auto-save (debounced).

Node colors:
- White card = individual
- Blue-tinted card = company / entity
- Percentage in **amber** = inbound total is less than 100% (incomplete)
- Percentage in **red** = inbound total exceeds 100% (over)

## Your data

- Everything lives in `data/owner-vis.db` (plus `-wal`/`-shm` sidecar files).
- To **back up** or **move** your graph to another machine, copy the `data/`
  folder.
- To **start fresh**, delete `data/owner-vis.db*` — the app recreates an empty
  database on next launch.

## File map

```
src/app/
  page.tsx                    redirect to /ownership
  layout.tsx                  root layout, metadata
  globals.css                 light-mode CSS forcing
  ownership/
    page.tsx                  server component, loads entities + edges from SQLite
    OwnershipGraph.tsx        client component, React Flow canvas
    OwnershipNode.tsx         custom node renderer
    EntityEditModal.tsx       node-edit modal
    actions.ts                server actions: CRUD on entities + edges
src/lib/
  db.ts                       SQLite connection + schema (auto-created)
```

## Embedding it elsewhere

If you want to pull the visualizer into another app:
1. Copy `src/app/ownership/*` (all five files).
2. Copy `src/lib/db.ts` (or replace with your own data adapter).
3. Install peer deps: `@xyflow/react`, `better-sqlite3`.

The component pair (`OwnershipGraph` + `OwnershipNode` + `EntityEditModal`)
is the visualizer. `actions.ts` is the data layer — swap it for any other
backend (Postgres, Prisma, raw fetch) by keeping the same function shapes.

## Next steps to consider

- Add auth + per-user filtering if you ever host this for more than one person.
- Add an export to PDF / SVG.
- Add validation (warn if outbound percentages from a parent exceed 100%).
```
