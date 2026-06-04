import { getDb } from "../../lib/db";
import { OwnershipGraph } from "./OwnershipGraph";
import type { DbEntity, DbEdge, EntityLink } from "./types";

type EntityRow = Omit<DbEntity, "links"> & { links: string | null };

// This page reads from the local SQLite database, so it must render per request
// rather than be prerendered at build time. Without this, `next build` would try
// to statically generate /ownership and touch the filesystem during the build.
export const dynamic = "force-dynamic";

function parseLinks(raw: string | null): EntityLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => l && typeof l === "object")
      .map((l) => ({ label: String(l.label ?? ""), url: String(l.url ?? "") }));
  } catch {
    return [];
  }
}

export default async function OwnershipPage() {
  const db = getDb();

  // rowid preserves insertion order (the order rows were added).
  const rows = db
    .prepare(
      `select id, name, category, subcategory, email, notes, color, links,
              position_x, position_y
       from ownership_entities order by rowid asc`,
    )
    .all() as EntityRow[];

  const entities: DbEntity[] = rows.map((r) => ({
    ...r,
    links: parseLinks(r.links),
  }));

  const edges = db
    .prepare(
      "select id, parent_id, child_id, percentage from ownership_edges",
    )
    .all() as DbEdge[];

  return (
    <main className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-xl font-semibold">Ownership &amp; IP map</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Add boxes for people, entities, products, and IP. Drag from one to
          another to define ownership percentages.
        </p>
      </div>

      <OwnershipGraph initialEntities={entities} initialEdges={edges} />
    </main>
  );
}
