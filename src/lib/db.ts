import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Owner Vis is a single-user local tool for mapping ownership, IP, and products
 * as a graph. Data lives in a local SQLite file (data/owner-vis.db) — no
 * accounts, no cloud, no env vars. Clone the repo, `npm install`, `npm run dev`,
 * and the database is created (and migrated) on first use.
 *
 * The connection is a lazy singleton: it's opened the first time getDb() is
 * called (at request time), not at import/build time, so `next build` never
 * needs to touch the filesystem.
 */

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });

  db = new Database(join(dataDir, "owner-vis.db"));
  // WAL gives better read/write concurrency; foreign_keys enables ON DELETE
  // CASCADE so deleting an entity removes its edges.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    create table if not exists ownership_entities (
      id          text primary key,
      name        text not null default '',
      category    text,
      subcategory text,
      email       text,
      notes       text,
      color       text,
      links       text,
      position_x  real not null default 0,
      position_y  real not null default 0,
      created_at  text not null default (datetime('now')),
      updated_at  text not null default (datetime('now'))
    );

    create table if not exists ownership_edges (
      id         text primary key,
      parent_id  text not null references ownership_entities(id) on delete cascade,
      child_id   text not null references ownership_entities(id) on delete cascade,
      percentage real not null check (percentage > 0 and percentage <= 100),
      created_at text not null default (datetime('now')),
      unique (parent_id, child_id),
      check (parent_id <> child_id)
    );

    create index if not exists ownership_edges_parent_idx on ownership_edges (parent_id);
    create index if not exists ownership_edges_child_idx on ownership_edges (child_id);
  `);

  migrate(db);
  return db;
}

/**
 * Forward-only, idempotent migrations for databases created by earlier versions.
 * Adds any missing columns, and migrates the old `entity_type` enum into the new
 * free-form `category` field before dropping it.
 */
function migrate(db: Database.Database) {
  const cols = db.prepare("pragma table_info(ownership_entities)").all() as {
    name: string;
  }[];
  const names = new Set(cols.map((c) => c.name));

  const addColumn = (name: string, decl: string) => {
    if (!names.has(name)) {
      db.exec(`alter table ownership_entities add column ${name} ${decl}`);
      names.add(name);
    }
  };

  addColumn("category", "text");
  addColumn("subcategory", "text");
  addColumn("color", "text");
  addColumn("links", "text");
  addColumn("notes", "text");

  // v1 used a strict entity_type enum ('individual' | 'company'). Fold it into
  // the free-form category, then drop the column (SQLite 3.35+ supports DROP).
  if (names.has("entity_type")) {
    db.exec(`
      update ownership_entities
      set category = case entity_type
        when 'individual' then 'Person'
        when 'company' then 'Company'
        else category
      end
      where category is null or category = ''
    `);
    db.exec("alter table ownership_entities drop column entity_type");
  }
}
