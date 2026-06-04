import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Owner Vis is a single-user local tool. Data lives in a local SQLite file
 * (data/owner-vis.db) — no accounts, no cloud, no env vars. Clone the repo,
 * `npm install`, `npm run dev`, and the database is created on first use.
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
      entity_type text not null check (entity_type in ('individual', 'company')),
      email       text,
      notes       text,
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

  return db;
}
