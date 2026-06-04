"use client";

import { MAX_LINKS, type DbEntity, type DbEdge, type EntityLink } from "./types";

// Per-browser persistence. Each visitor gets their own map saved in their own
// browser via localStorage — no server, no database, no accounts.

const K_ENTITIES = "owner-vis.entities.v1";
const K_EDGES = "owner-vis.edges.v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers.
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function cleanLinks(links: EntityLink[] | undefined | null): EntityLink[] {
  if (!links) return [];
  return links
    .map((l) => ({ label: String(l.label ?? "").trim(), url: String(l.url ?? "").trim() }))
    .filter((l) => l.url !== "" || l.label !== "")
    .slice(0, MAX_LINKS);
}

export function loadGraph(): { entities: DbEntity[]; edges: DbEdge[] } {
  return { entities: read<DbEntity>(K_ENTITIES), edges: read<DbEdge>(K_EDGES) };
}

export function addEntity(input: {
  name: string;
  category?: string | null;
  subcategory?: string | null;
  email?: string | null;
  color?: string | null;
  links?: EntityLink[];
  position_x?: number;
  position_y?: number;
}): DbEntity {
  const entity: DbEntity = {
    id: uuid(),
    name: input.name,
    category: input.category ?? null,
    subcategory: input.subcategory ?? null,
    email: input.email ?? null,
    notes: null,
    color: input.color ?? null,
    links: cleanLinks(input.links),
    position_x: input.position_x ?? 0,
    position_y: input.position_y ?? 0,
  };
  const entities = read<DbEntity>(K_ENTITIES);
  entities.push(entity);
  write(K_ENTITIES, entities);
  return entity;
}

export function updateEntity(
  id: string,
  patch: {
    name?: string;
    category?: string | null;
    subcategory?: string | null;
    email?: string | null;
    notes?: string | null;
    color?: string | null;
    links?: EntityLink[];
  },
): void {
  const entities = read<DbEntity>(K_ENTITIES);
  const next = entities.map((e) =>
    e.id === id
      ? {
          ...e,
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.category !== undefined && { category: patch.category }),
          ...(patch.subcategory !== undefined && { subcategory: patch.subcategory }),
          ...(patch.email !== undefined && { email: patch.email }),
          ...(patch.notes !== undefined && { notes: patch.notes }),
          ...(patch.color !== undefined && { color: patch.color }),
          ...(patch.links !== undefined && { links: cleanLinks(patch.links) }),
        }
      : e,
  );
  write(K_ENTITIES, next);
}

export function updateEntityPositions(
  positions: Array<{ id: string; x: number; y: number }>,
): void {
  const map = new Map(positions.map((p) => [p.id, p]));
  const entities = read<DbEntity>(K_ENTITIES);
  const next = entities.map((e) => {
    const p = map.get(e.id);
    return p ? { ...e, position_x: p.x, position_y: p.y } : e;
  });
  write(K_ENTITIES, next);
}

export function deleteEntity(id: string): void {
  write(
    K_ENTITIES,
    read<DbEntity>(K_ENTITIES).filter((e) => e.id !== id),
  );
  // Cascade: drop edges touching this entity.
  write(
    K_EDGES,
    read<DbEdge>(K_EDGES).filter((e) => e.parent_id !== id && e.child_id !== id),
  );
}

export function addEdge(input: {
  parent_id: string;
  child_id: string;
  percentage: number;
}): { ok: true; edge: DbEdge } | { ok: false; error: string } {
  if (input.parent_id === input.child_id) {
    return { ok: false, error: "An entity cannot own itself" };
  }
  const edges = read<DbEdge>(K_EDGES);
  if (edges.some((e) => e.parent_id === input.parent_id && e.child_id === input.child_id)) {
    return { ok: false, error: "That ownership link already exists — edit it instead." };
  }
  const edge: DbEdge = {
    id: uuid(),
    parent_id: input.parent_id,
    child_id: input.child_id,
    percentage: input.percentage,
  };
  edges.push(edge);
  write(K_EDGES, edges);
  return { ok: true, edge };
}

export function updateEdge(id: string, patch: { percentage: number }): void {
  write(
    K_EDGES,
    read<DbEdge>(K_EDGES).map((e) => (e.id === id ? { ...e, percentage: patch.percentage } : e)),
  );
}

export function deleteEdge(id: string): void {
  write(
    K_EDGES,
    read<DbEdge>(K_EDGES).filter((e) => e.id !== id),
  );
}
