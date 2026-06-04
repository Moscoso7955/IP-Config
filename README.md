# Owner Vis

A Next.js + React Flow app for visualizing ownership, IP, and products as a
graph. Add boxes for people, entities, products, and IP; give each one a parent
label, a sub label, a color, and up to 4 links; then drag from one box to
another to define ownership percentages. The graph computes inbound totals so
you can spot incomplete ownership (e.g. "this LLC only has 65% accounted for").

**No backend, no accounts, no database.** Each visitor's map is saved in their
own browser (`localStorage`). Send someone the link and they get their own
private map to build. Clearing the browser's site data resets it.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000> — you'll be redirected to `/ownership`.

## Deploy

It's a static client app, so it deploys anywhere that hosts Next.js. On
[Vercel](https://vercel.com): import the repo and deploy — there are no
environment variables to set.

## Using it

- **+ Add box** — adds a box and opens the side pane to edit it.
- **Side pane** — set the name, a **parent label** (e.g. Owner / Product / IP),
  a **sub** label, a **color**, an email, notes, and up to **4 links**.
- **+ Add child (connected below)** — creates a new box already connected to the
  current one at 100% and opens it, so you can build a tree quickly.
- **Drag** from the bottom of one box to the top of another — creates an
  ownership edge (you'll be prompted for a percentage).
- **Click** an edge to edit its percentage, or type "delete" to remove it.
- **Drag** boxes to lay out the graph; positions are saved automatically.

Percentage colors on a box:
- **amber** = inbound total is less than 100% (incomplete)
- **red** = inbound total exceeds 100% (over)

## Your data

- Everything is stored in your browser under the `owner-vis.*` localStorage keys.
- It's per-browser and per-device — it does not sync across devices, and other
  visitors to the same URL have their own separate maps.
- To start fresh, clear this site's data in your browser.

## File map

```
src/app/
  page.tsx                    redirect to /ownership
  layout.tsx                  root layout, metadata
  globals.css                 light-mode CSS forcing
  ownership/
    page.tsx                  renders the graph
    OwnershipGraph.tsx        React Flow canvas + state
    OwnershipNode.tsx         custom node renderer
    EntityDetailsPane.tsx     right-hand details/edit pane
    store.ts                  localStorage data layer
    types.ts                  shared types
```

## Next steps to consider

- Export / import a map as JSON (so a map can be shared or backed up).
- Export to PDF / SVG.
- Validation (warn if outbound percentages from a parent exceed 100%).
