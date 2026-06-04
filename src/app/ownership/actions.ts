"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase";

// Single-user, no auth. The supabase client uses the public anon key and
// permissive RLS lets it CRUD freely. If you bolt auth on later, add a
// user-id check + per-user filters here.

export async function addEntity(input: {
  name: string;
  entity_type: "individual" | "company";
  email?: string | null;
  position_x?: number;
  position_y?: number;
}) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ownership_entities")
      .insert({
        name: input.name,
        entity_type: input.entity_type,
        email: input.email ?? null,
        position_x: input.position_x ?? 0,
        position_y: input.position_y ?? 0,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/ownership");
    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateEntity(entityId: string, patch: {
  name?: string;
  entity_type?: "individual" | "company";
  email?: string | null;
  notes?: string | null;
}) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("ownership_entities")
      .update({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.entity_type !== undefined && { entity_type: patch.entity_type }),
        ...(patch.email !== undefined && { email: patch.email }),
        ...(patch.notes !== undefined && { notes: patch.notes }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId);
    if (error) return { error: error.message };
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
    const supabase = createClient();
    // Small N (<50 typical), per-row updates are fine.
    for (const p of positions) {
      await supabase
        .from("ownership_entities")
        .update({ position_x: p.x, position_y: p.y })
        .eq("id", p.id);
    }
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteEntity(entityId: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("ownership_entities")
      .delete()
      .eq("id", entityId);
    if (error) return { error: error.message };
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
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ownership_edges")
      .insert({
        parent_id: input.parent_id,
        child_id: input.child_id,
        percentage: input.percentage,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/ownership");
    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateEdge(edgeId: string, patch: { percentage: number }) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("ownership_edges")
      .update({ percentage: patch.percentage })
      .eq("id", edgeId);
    if (error) return { error: error.message };
    revalidatePath("/ownership");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteEdge(edgeId: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("ownership_edges")
      .delete()
      .eq("id", edgeId);
    if (error) return { error: error.message };
    revalidatePath("/ownership");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
