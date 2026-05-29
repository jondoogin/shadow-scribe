/**
 * AuthContext — Supabase magic-link auth state.
 *
 * Provides:
 *   - session, user           — current Supabase session/user (null when signed out)
 *   - status                  — 'loading' | 'signed-in' | 'signed-out' | 'disabled'
 *   - sendMagicLink(email)    — triggers a magic-link email; returns { ok, error }
 *   - signOut()               — local sign-out (Supabase session cleared)
 *
 * When VITE_SUPABASE_URL/ANON_KEY are not set, status stays 'disabled' and
 * all helpers no-op. The rest of the app continues to use localStorage only.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isCloudEnabled } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Cloud disabled — short-circuit to a stable "disabled" state.
  const [session, setSession] = useState(null)
  const [status,  setStatus]  = useState(isCloudEnabled ? 'loading' : 'disabled')

  useEffect(() => {
    if (!isCloudEnabled) return

    let active = true

    // Initial session lookup (resolves the magic-link redirect if present)
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    // Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return
      setSession(newSession)
      setStatus(newSession ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [])

  const sendMagicLink = useCallback(async (email) => {
    if (!isCloudEnabled) return { ok: false, error: 'Cloud sync is not configured.' }
    const cleanEmail = (email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.origin + '/library',
        shouldCreateUser: true,
      },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  const signOut = useCallback(async () => {
    if (!isCloudEnabled) return
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      status,
      isCloudEnabled,
      sendMagicLink,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
