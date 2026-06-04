import { getDb } from "../../lib/db";
import { OwnershipGraph } from "./OwnershipGraph";

type DbEntity = {
  id: string;
  name: string;
  entity_type: "individual" | "company";
  email: string | null;
  position_x: number | null;
  position_y: number | null;
};

type DbEdge = {
  id: string;
  parent_id: string;
  child_id: string;
  percentage: number;
};

// This page reads from the local SQLite database, so it must render per request
// rather than be prerendered at build time. Without this, `next build` would try
// to statically generate /ownership and touch the filesystem during the build.
export const dynamic = "force-dynamic";

export default async function OwnershipPage() {
  const db = getDb();

  // rowid preserves insertion order (the order rows were added).
  const entities = db
    .prepare(
      `select id, name, entity_type, email, position_x, position_y
       from ownership_entities order by rowid asc`,
    )
    .all() as DbEntity[];

  const edges = db
    .prepare(
      "select id, parent_id, child_id, percentage from ownership_edges",
    )
    .all() as DbEdge[];

  return (
    <main className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-xl font-semibold">Ownership structure</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Add people and entities, then drag from one to another to define
          ownership percentages.
        </p>
      </div>

      <OwnershipGraph initialEntities={entities} initialEdges={edges} />
    </main>
  );
}
