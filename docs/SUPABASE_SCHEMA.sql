-- ─────────────────────────────────────────────────────────────────────────────
-- Lantern — Supabase schema
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL Editor when setting up a new project.
-- Idempotent: safe to re-run; CREATE statements use IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── BOOKS ────────────────────────────────────────────────────────────────────
-- One row per (book.id, user) — the whole book object stored as JSONB.
-- This is intentionally schemaless on the data column so the app can evolve
-- without migrations. (book.id, user_id) is the composite primary key —
-- the same demo book IDs across users don't collide.

create table if not exists public.lantern_books (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (id, user_id)
);

create index if not exists lantern_books_user_idx on public.lantern_books (user_id);
create index if not exists lantern_books_updated_idx on public.lantern_books (updated_at desc);

-- ── SETTINGS ─────────────────────────────────────────────────────────────────
-- One row per user. Stored as JSONB so the settings schema can evolve freely.

create table if not exists public.lantern_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Users can only see and modify their own rows. The anon public key used in
-- the client is therefore safe to expose — without a valid JWT no rows
-- are accessible.

alter table public.lantern_books    enable row level security;
alter table public.lantern_settings enable row level security;

-- Books policies
drop policy if exists "books_select_own" on public.lantern_books;
drop policy if exists "books_insert_own" on public.lantern_books;
drop policy if exists "books_update_own" on public.lantern_books;
drop policy if exists "books_delete_own" on public.lantern_books;

create policy "books_select_own" on public.lantern_books
  for select using (auth.uid() = user_id);
create policy "books_insert_own" on public.lantern_books
  for insert with check (auth.uid() = user_id);
create policy "books_update_own" on public.lantern_books
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books_delete_own" on public.lantern_books
  for delete using (auth.uid() = user_id);

-- Settings policies
drop policy if exists "settings_select_own" on public.lantern_settings;
drop policy if exists "settings_insert_own" on public.lantern_settings;
drop policy if exists "settings_update_own" on public.lantern_settings;

create policy "settings_select_own" on public.lantern_settings
  for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.lantern_settings
  for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.lantern_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
