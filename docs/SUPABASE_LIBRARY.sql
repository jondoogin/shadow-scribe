-- ─────────────────────────────────────────────────────────────────────────────
-- Lantern — encrypted cloud library (Session 169). See docs/LIBRARY.md.
-- ─────────────────────────────────────────────────────────────────────────────
-- Run once after docs/SUPABASE_SCHEMA.sql. Idempotent and additive: it creates
-- two tables and one private Storage bucket, and changes nothing that exists.
--
-- Everything stored here is encrypted in the browser before upload with a key
-- only the reader's passphrase can unlock. The server holds ciphertext, sizes,
-- kinds and the EPUB hash (`content_id`, which lantern_books already holds).
-- ─────────────────────────────────────────────────────────────────────────────

-- One row per user: the library key, wrapped (encrypted) with a key derived
-- from the reader's passphrase (PBKDF2-SHA256). Without the passphrase it is
-- useless. Losing the passphrase loses the library; there is no recovery.
create table if not exists public.lantern_library_keys (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  kdf          text not null default 'PBKDF2-SHA256',
  iterations   integer not null,
  salt         text not null,            -- base64
  wrapped_key  text not null,            -- base64: iv(12) || AES-GCM(library secret)
  created_at   timestamptz not null default now()
);

-- One row per stored file (an EPUB, a .lantern-audio or a .lantern-visuals
-- package). The file itself is split into encrypted chunks in Storage at
-- lantern-library/<user_id>/<id>/<chunk index>.
create table if not exists public.lantern_library_items (
  id           uuid primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('epub', 'audio', 'visuals')),
  content_id   text not null,            -- 'sha256:' + EPUB hash; matches book.contentId
  dedupe_key   text not null,            -- HMAC(kind + natural id) under the library key
  bytes        bigint not null,
  chunk_size   integer not null,
  chunk_count  integer not null,
  meta_enc     text not null,            -- base64 AES-GCM: { title, author, filename, label }
  status       text not null default 'uploading' check (status in ('uploading', 'ready')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index if not exists lantern_library_items_user_idx on public.lantern_library_items (user_id);

-- Per-book presets (narration source, speed, painting preferences), one
-- encrypted JSON blob per user.
create table if not exists public.lantern_library_presets (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  data_enc     text not null,
  updated_at   timestamptz not null default now()
);

alter table public.lantern_library_keys    enable row level security;
alter table public.lantern_library_items   enable row level security;
alter table public.lantern_library_presets enable row level security;

drop policy if exists "library_keys_own"    on public.lantern_library_keys;
drop policy if exists "library_items_own"   on public.lantern_library_items;
drop policy if exists "library_presets_own" on public.lantern_library_presets;

create policy "library_keys_own" on public.lantern_library_keys
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "library_items_own" on public.lantern_library_items
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "library_presets_own" on public.lantern_library_presets
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ── STORAGE ──────────────────────────────────────────────────────────────────
-- Private bucket; each user reads and writes only under their own folder.
-- Chunks are 8 MiB of plaintext, so 16 MiB is a generous per-object limit.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lantern-library', 'lantern-library', false, 16777216)
on conflict (id) do nothing;

drop policy if exists "library_objects_select_own" on storage.objects;
drop policy if exists "library_objects_insert_own" on storage.objects;
drop policy if exists "library_objects_update_own" on storage.objects;
drop policy if exists "library_objects_delete_own" on storage.objects;

create policy "library_objects_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'lantern-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "library_objects_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'lantern-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "library_objects_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'lantern-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "library_objects_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'lantern-library' and (storage.foldername(name))[1] = (select auth.uid())::text);
