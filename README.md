# Owner Vis

A standalone Next.js + Supabase + React Flow app for visualizing an ownership
structure as a graph. Add people and entities, drag from one to another to
define a percentage, and the graph computes inbound totals so you can spot
incomplete ownership (e.g. "this LLC only has 65% accounted for").

Single-user, no auth. The Supabase anon key has direct read/write access to
the two tables; RLS is disabled. Don't deploy this as-is on a public URL
without bolting auth on first.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates `ownership_entities` and `ownership_edges` with RLS off.
3. Copy the **Project URL** and an **anon / publishable key** from **Project Settings → API**.

### 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in the two values you copied:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 3. Run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/ownership`.

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

## File map

```
src/app/
  page.tsx                    redirect to /ownership
  layout.tsx                  root layout, metadata
  globals.css                 light-mode CSS forcing
  ownership/
    page.tsx                  server component, loads entities + edges
    OwnershipGraph.tsx        client component, React Flow canvas
    OwnershipNode.tsx         custom node renderer
    EntityEditModal.tsx       node-edit modal
    actions.ts                server actions: CRUD on entities + edges
src/lib/
  supabase.ts                 supabase-js client factory
supabase/
  schema.sql                  Postgres schema
```

## Embedding it elsewhere

If you want to pull the visualizer into another app:
1. Copy `src/app/ownership/*` (all five files).
2. Copy `src/lib/supabase.ts` (or replace with your own data adapter).
3. Run `supabase/schema.sql` against your project's Postgres.
4. Install peer deps: `@xyflow/react`, `@supabase/supabase-js`.

The component pair (`OwnershipGraph` + `OwnershipNode` + `EntityEditModal`)
is the visualizer. `actions.ts` is the data layer — swap it for any other
backend (Drizzle, Prisma, raw fetch) by keeping the same function shapes.

## Next steps to consider

- Add auth + per-user filtering before sharing the URL.
- Add an export to PDF / SVG.
- Add validation (warn if outbound percentages from a parent exceed 100%).
