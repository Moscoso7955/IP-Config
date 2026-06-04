import { createClient } from "../../lib/supabase";
import { OwnershipGraph } from "./OwnershipGraph";

export default async function OwnershipPage() {
  const supabase = createClient();

  const [{ data: entities }, { data: edges }] = await Promise.all([
    supabase
      .from("ownership_entities")
      .select("id, name, entity_type, email, position_x, position_y")
      .order("created_at", { ascending: true }),
    supabase
      .from("ownership_edges")
      .select("id, parent_id, child_id, percentage"),
  ]);

  return (
    <main className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-xl font-semibold">Ownership structure</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Add people and entities, then drag from one to another to define
          ownership percentages.
        </p>
      </div>

      <OwnershipGraph
        initialEntities={entities ?? []}
        initialEdges={edges ?? []}
      />
    </main>
  );
}
