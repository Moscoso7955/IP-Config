-- Owner Vis schema. Run once in the Supabase SQL Editor for your project.
-- This is a single-user, no-auth tool, so we leave RLS DISABLED on these
-- tables. If you later bolt auth on, add per-user columns + policies before
-- shipping to production.

create extension if not exists "pgcrypto";

create table if not exists public.ownership_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  entity_type text not null check (entity_type in ('individual', 'company')),
  email text,
  notes text,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ownership_edges (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.ownership_entities(id) on delete cascade,
  child_id uuid not null references public.ownership_entities(id) on delete cascade,
  percentage numeric(6, 3) not null check (percentage > 0 and percentage <= 100),
  created_at timestamptz not null default now(),
  -- An ownership relationship between a given parent and child is unique.
  -- (Edit the row instead of creating a duplicate.)
  unique (parent_id, child_id),
  -- An entity can't own itself.
  check (parent_id <> child_id)
);

create index if not exists ownership_edges_parent_idx on public.ownership_edges (parent_id);
create index if not exists ownership_edges_child_idx on public.ownership_edges (child_id);

-- RLS off for the single-user demo. The anon key has full read/write access.
alter table public.ownership_entities disable row level security;
alter table public.ownership_edges disable row level security;
