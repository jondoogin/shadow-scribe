# Lantern — Encrypted cloud library (Session 169)

John's decision (2026-11-21): keep EPUBs, narration (`.lantern-audio`), paintings
(`.lantern-visuals`) and per-book presets in Lantern's Supabase project,
**encrypted on the device before upload**, so they don't need re-importing on
every device (Mac on `localhost:5230`, the Vercel site, iPhone).

This replaces the earlier rule "never sync book text or audio to Supabase" with:
**book text and audio may go to Supabase only as ciphertext from this library.**
`shadowscribe_books` and `lantern_books` still never hold text or audio.

## What is stored

| Kind | What goes up | How it comes back |
|---|---|---|
| `epub` | the original EPUB file, as imported | `parseEpub` → `saveContent` (same `contentId`, so narration and paintings still match) |
| `audio` | the `.lantern-audio` package, as imported | `openAudiobookPackage` → `saveAudiobook` |
| `visuals` | the `.lantern-visuals` package, as imported | `importVisualPackage` (needs the EPUB on the device first) |
| presets | per-book `prefs` + `visuals` and the app-wide Listen prefs from `lantern_listen` | three-way merge (`src/library/presets.js`) |

Reading positions are not part of the library. Files restore through the same
importers as a hand-picked file, so DRM, manifest, edition and spoiler checks
all still apply. Existing on-device books aren't uploaded retroactively (the
original files weren't kept); importing them once more saves them.

## Encryption (`src/library/libraryCrypto.js`, Web Crypto only)

- A random 32-byte **library secret** per account, wrapped with AES-GCM under a
  key derived from the reader's **passphrase** (PBKDF2-SHA256, 600,000 iterations,
  random salt). The server row `lantern_library_keys` holds only salt, iteration
  count and the wrapped secret. **A forgotten passphrase cannot be recovered.**
- HKDF derives a file key (AES-GCM-256) and a dedupe key (HMAC-SHA256). Both are
  non-extractable. "Remember on this device" keeps them in IndexedDB
  `lantern_library_device` (not `lantern_content`, so no schema bump).
- Files are split into 8 MiB chunks; each is `iv(12) || AES-GCM` with additional
  data `<itemId>:<index>:<count>`, so chunks can't be swapped, reordered or
  truncated without failing. Titles, filenames and labels are encrypted too
  (`meta_enc`). The server sees: kind, `content_id` (the EPUB hash, which
  `lantern_books` already holds), sizes, chunk counts and timestamps.
- `dedupe_key` = HMAC(kind:naturalId), so re-importing the same file never stores it twice.

## Server (`docs/SUPABASE_LIBRARY.sql`)

Tables `lantern_library_keys`, `lantern_library_items`, `lantern_library_presets`
with owner-only RLS, and a private bucket `lantern-library` where each user can
only touch `<user_id>/…`. Chunks live at `<user_id>/<item id>/<00000…>`.
Additive and idempotent. Settings → delete cloud data also removes the library.

Cost: the Lantern Supabase org is on the Pro plan (100 GB storage included,
then about $0.021 per GB-month). Narration is roughly 300 MB per 100k-word
novel at 64 kbps; EPUBs are a few MB; a painting set is tens of MB.

## App

- `src/library/libraryStore.js` — runtime: follows the signed-in user
  (`AuthContext` → `attachUser`), unlock/lock, listing, background upload queue
  (one at a time), downloads, preset sync. `useLibrary()` for React.
- `src/library/restore.js` — `backupEpub` / `backupNarration` / `backupPaintings`
  (called after each import; never block or fail the import), `restoreFromLibrary`.
- `src/library/LibrarySettings.jsx` — Settings → Your library: create (passphrase
  twice), unlock, "Save imports to my library" toggle, per-book list with Get / Delete, Lock.
- `src/library/FromLibrary.jsx` — "In your library: … · Get from library" on the
  Listen and Reader empty states and in Listen's Narration panel. When it shows,
  it becomes the primary action and Link EPUB becomes secondary.
- Presets sync in `PlaybackContext` when the library unlocks, when the app goes
  to the background, and every 5 minutes. A device that never synced takes the
  cloud's copy, so fresh-device defaults don't overwrite real choices.

## Testing

- `npm test` covers the crypto, chunking, tamper detection, dedupe, interrupted
  uploads and the preset merge (`src/library/*.test.js`), with an in-memory backend.
- In development, `window.__lanternLibrary.useBackend()` swaps in the in-memory
  backend so a browser test can run the whole flow without Supabase.

## Trying it on a Vercel preview

Only the `shadow-scribe-gi6k` project has the Supabase variables. Production has
them; for this branch's preview they were added as branch-scoped Preview
variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, the public anon key).
The `shadow-scribe` project has none, so its previews show "Cloud sync isn't
configured". Email-link and Google sign-in return to the preview only if its
domain is in Supabase → Authentication → URL Configuration; password sign-in
works without that.

## Seamless Listen (Session 170)

John (2026-11-21): "make this process extremely easy". What changed:

- **Narrator shelf (Mac, dev server only).** `scripts/narrator-shelf.mjs` is a
  Vite dev plugin serving `GET /__lantern/shelf` (listing) and
  `/__lantern/shelf/<name>` for `*.epub` at the top of the narrator home and
  `*.lantern-audio` / `*.lantern-visuals` at the top of `<home>/output/`.
  Sub-folders are never served: **retire a set by moving it to
  `output/archive/`.** `src/library/shelf.js` (run by `ShelfSync` on start,
  on unlock and every minute) imports each file on the device (EPUBs first)
  and uploads it encrypted. Home: `$LANTERN_NARRATOR_HOME`, else
  `../narrator-data` beside the repo, else `~/.lantern-narrator`.
- **Dropdowns.** Listen has two selects, Narrator and Paintings
  (`src/components/listen/AssetPickers.jsx`), fed by `src/library/bookAssets.js`,
  which merges device and library items for the same work (same `contentId`,
  or same title for another copy). Picking one that isn't here downloads it.
- **No edition errors.** `bringToDevice` fetches the EPUB an asset was made
  from (if the library has it) and re-links the companion to it
  (`book.contentId`), the same thing a narration import always did. Spoiler
  checks are unchanged: paintings still import against that EPUB's sections.
- **Automatic first open.** On a device with nothing, Listen fetches the
  EPUB, the preferred narrator (if under 80 MB) and the preferred painting
  set by itself. Choices sync as presets: `books[id].prefs.source` and
  `books[id].visuals.setId`.
- File imports moved into "On this device" (`AddFiles.jsx`, one picker for
  EPUB, narration or paintings). `ImportNarration.jsx` / `FromLibrary.jsx`
  remain for the Reader empty state and older paths.

## Not built yet

- `lantern-narrate` uploading straight from the Mac (it would need a sign-in and
  the passphrase on the CLI). For now: import on the Mac once and it uploads.
- The Mac CLI's own per-book choices (`books.json`, designed voices, painting
  style flags) stay on the Mac, where generation happens.
