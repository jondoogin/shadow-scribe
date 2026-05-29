# Supabase Setup — Lantern Cloud Sync

This document is the **complete setup checklist** for enabling cross-device library sync. Until you complete this, the app continues to run identically to before — entirely off `localStorage`. No code changes are needed after this — once the env vars are present, the sync engine wakes up automatically.

---

## 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com).
2. New Project. Pick a name (e.g. `lantern-prod`), set a strong DB password, choose the closest region.
3. Wait for the project to provision (~2 minutes).

---

## 2. Run the schema

In the Supabase dashboard, open **SQL Editor → New query** and paste the contents of `docs/SUPABASE_SCHEMA.sql` (in this repo). Run it.

This creates two tables (`lantern_books`, `lantern_settings`) and Row Level Security policies that ensure each user can only read and write their own data.

---

## 3. Configure auth (magic-link email)

1. **Authentication → Providers** — ensure **Email** is enabled. Magic link is on by default.
2. **Authentication → URL Configuration** — add your redirect URLs:
   - `http://localhost:5220/library` (or whatever port `vite` is using locally)
   - `http://localhost:5173/library` (default vite port — add as a safety net)
   - `https://www.readwithlantern.com/library` (production)
   - `https://lantern-*.vercel.app/library` (Vercel preview URLs — use a wildcard if Supabase allows)
3. **Authentication → Email Templates → Magic Link** — optionally customize the email to match Lantern's voice. Default works fine.
4. **(Optional) Custom SMTP** — Supabase's free tier sends email from their domain. For a production-grade experience, set up custom SMTP via Resend, Postmark, or SendGrid.

---

## 4. Copy the keys

**Project Settings → API:**
- Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
- Copy the **anon public** key (long JWT-like string starting with `eyJ`)

⚠️ The anon key is safe to expose in client code — Row Level Security protects user data. **Never copy the service_role key into client code or env vars exposed to the browser.**

---

## 5. Add to environments

### Local development

Create `.env.local` at the project root (this file is gitignored):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart the dev server.

### Production (Vercel)

Project Settings → Environment Variables → add both for **Production** and **Preview**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Redeploy.

---

## 6. Verify

1. Open the app. Go to **Settings**.
2. The "Sync" section at the top should show an email input.
3. Enter your email → click **Email a link →**.
4. Check your inbox. Click the link.
5. You'll land back in Lantern, signed in. Settings should show your email and "Your library syncs across devices."

To verify sync is actually working:
- In the SQL Editor, run `select count(*) from lantern_books` — should match your local library size after ~2 seconds.
- Open the app in a different browser, sign in with the same email — your library should appear there.

---

## What happens if Supabase is misconfigured?

- **No env vars at all** → Sync section in Settings shows "Cloud sync isn't configured yet." App works normally.
- **URL/key set but no schema** → Sign-in succeeds, but pushes fail in the console with `relation does not exist`. Run step 2.
- **Schema set but RLS not enabled** → Pushes succeed but other users could read your data. The schema enables RLS automatically.

---

## Cost notes

Supabase's free tier covers:
- 500 MB of database storage (more than enough for thousands of users)
- 2 GB of egress per month
- 50,000 monthly active users
- 50 MB of file storage (Lantern doesn't use file storage)

For a personal product alpha, the free tier is fine. Upgrade to Pro ($25/mo) when you exceed any of these.
