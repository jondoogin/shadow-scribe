/**
 * Supabase client — single source of truth for cloud persistence.
 *
 * Returns a real Supabase client if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * are configured. Otherwise returns null — the rest of the app treats a null
 * client as "cloud sync disabled" and continues to work entirely off localStorage.
 *
 * This means a fresh clone of Lantern with no Supabase env vars runs identically
 * to how it always has. Sign-in UI is hidden when there is no client.
 *
 * Setup checklist for John:
 *   1. Create a project at supabase.com
 *   2. In the SQL editor, run the schema in docs/SUPABASE_SCHEMA.sql
 *   3. Project Settings → API → copy the project URL and anon public key
 *   4. Add to .env.local for dev and to Vercel project env for production:
 *        VITE_SUPABASE_URL=https://xxx.supabase.co
 *        VITE_SUPABASE_ANON_KEY=eyJ...
 *   5. Project Settings → Authentication → URL Configuration:
 *        add your local + production URLs as redirect URLs
 */

import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (URL && KEY)
  ? createClient(URL, KEY, {
      auth: {
        persistSession:    true,    // session in localStorage so reloads stay signed in
        autoRefreshToken:  true,
        detectSessionInUrl: true,   // magic-link redirect handling
      },
    })
  : null

export const isCloudEnabled = !!supabase
