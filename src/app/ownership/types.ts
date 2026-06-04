// Shared, runtime-free types for the ownership/IP/product graph. Safe to import
// from both server (page.tsx) and client (graph/node/pane) modules.

export type EntityLink = {
  label: string;
  url: string;
};

export type DbEntity = {
  id: string;
  name: string;
  // Free-form classification: a parent label (e.g. "Product", "IP", "Owner")
  // and a sub label (e.g. "SaaS", "Patent"). Both optional.
  category: string | null;
  subcategory: string | null;
  email: string | null;
  notes: string | null;
  // Custom node color as a hex string, e.g. "#3b82f6". Null = default styling.
  color: string | null;
  // Up to 4 labeled links.
  links: EntityLink[];
  position_x: number | null;
  position_y: number | null;
};

export type DbEdge = {
  id: string;
  parent_id: string;
  child_id: string;
  percentage: number;
};

export const MAX_LINKS = 4;
