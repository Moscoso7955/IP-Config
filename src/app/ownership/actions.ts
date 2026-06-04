"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDb } from "../../lib/db";
import { MAX_LINKS, type EntityLink } from "./types";

// Single-user, no auth. Data lives in a local SQLite file (see src/lib/db.ts).
// Each action returns either a result object or { error } so the UI can show a
// message — the function shapes match what OwnershipGraph expects.

// Keep at most MAX_LINKS well-formed links and serialize them for storage.
function serializeLinks(links: EntityLink[] | undefined | null): string {
  if (!links) return "[]";
  const clean = links
    .map((l) => ({ label: String(l.label ?? "").trim(), url: String(l.url ?? "").trim() }))
    .filter((l) => l.url !== "" || l.label !== "")
    .slice(0, MAX_LINKS);
  return JSON.stringify(clean);
}

export async function addEntity(input: {
  name: string;
  category?: string | null;
  subcategory?: string | null;
  email?: string | null;
  color?: string | null;
  links?: EntityLink[];
  position_x?: number;
  position_y?: number;
}) {
  try {
    const db = getDb();
    const id = randomUUID();
    db.prepare(
      `insert into ownership_entities
         (id, name, category, subcategory, email, color, links, position_x, position_y)
       values
         (@id, @name, @category, @subcategory, @email, @color, @links, @position_x, @position_y)`,
    ).run({
      id,
      name: input.name,
      category: input.category ?? null,
      subcategory: input.subcategory ?? null,
      email: input.email ?? null,
      color: input.color ?? null,
      links: serializeLinks(input.links),
      position_x: input.position_x ?? 0,
      position_y: input.position_y ?? 0,
    });
    revalidatePath("/ownership");
    return { id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateEntity(entityId: string, patch: {
  name?: string;
  category?: string | null;
  subcategory?: string | null;
  email?: string | null;
  notes?: string | null;
  color?: string | null;
  links?: EntityLink[];
}) {
  try {
    const db = getDb();
    const sets: string[] = [];
    const params: Record<string, unknown> = { id: entityId };
    if (patch.name !== undefined) { sets.push("name = @name"); params.name = patch.name; }
    if (patch.category !== undefined) { sets.push("category = @category"); params.category = patch.category; }
    if (patch.subcategory !== undefined) { sets.push("subcategory = @subcategory"); params.subcategory = patch.subcategory; }
    if (patch.email !== undefined) { sets.push("email = @email"); params.email = patch.email; }
    if (patch.notes !== undefined) { sets.push("notes = @notes"); params.notes = patch.notes; }
    if (patch.color !== undefined) { sets.push("color = @color"); params.color = patch.color; }
    if (patch.links !== undefined) { sets.push("links = @links"); params.links = serializeLinks(patch.links); }
    sets.push("updated_at = datetime('now')");

    db.prepare(
      `update ownership_entities set ${sets.join(", ")} where id = @id`,
    ).run(params);
    revalidatePath("/ownership");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateEntityPositions(positions: Array<{
  id: string;
  x: number;
  y: number;
}>) {
  try {
    const db = getDb();
    const stmt = db.prepare(
      "update ownership_entities set position_x = @x, position_y = @y where id = @id",
    );
    // One transaction for all rows — fast and atomic.
    const tx = db.transaction((rows: typeof positions) => {
      for (const p of rows) stmt.run(p);
    });
    tx(positions);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteEntity(entityId: string) {
  try {
    const db = getDb();
    // Edges are removed automatically via ON DELETE CASCADE.
    db.prepare("delete from ownership_entities where id = ?").run(entityId);
    revalidatePath("/ownership");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function addEdge(input: {
  parent_id: string;
  child_id: string;
  percentage: number;
}) {
  try {
    if (input.parent_id === input.child_id) {
      return { error: "An entity cannot own itself" };
    }
    const db = getDb();
    const id = randomUUID();
    db.prepare(
      `insert into ownership_edges (id, parent_id, child_id, percentage)
       values (@id, @parent_id, @child_id, @percentage)`,
    ).run({
      id,
      parent_id: input.parent_id,
      child_id: input.child_id,
      percentage: input.percentage,
    });
    revalidatePath("/ownership");
    return { id };
  } catch (err) {
    // Surface the unique-constraint case with a friendlier message.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return { error: "That ownership link already exists — edit it instead." };
    }
    return { error: msg };
  }
}

export async function updateEdge(edgeId: string, patch: { percentage: number }) {
  try {
    const db = getDb();
    db.prepare("update ownership_edges set percentage = ? where id = ?").run(
      patch.percentage,
      edgeId,
    );
    revalidatePath("/ownership");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteEdge(edgeId: string) {
  try {
    const db = getDb();
    db.prepare("delete from ownership_edges where id = ?").run(edgeId);
    revalidatePath("/ownership");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
