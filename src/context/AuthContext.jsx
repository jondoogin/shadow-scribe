/**
 * AuthContext — Supabase auth state.
 *
 * Provides:
 *   - session, user                 — current Supabase session/user (null when signed out)
 *   - status                        — 'loading' | 'signed-in' | 'signed-out' | 'disabled'
 *   - sendMagicLink(email)          — magic-link email; returns { ok, error }
 *   - signUp(email, password)       — email/password account creation; returns { ok, error, confirmationRequired }
 *   - signInWithPassword(email, pw) — password sign-in; returns { ok, error }
 *   - signInWithGoogle()            — Google OAuth (redirects browser); returns { ok, error }
 *   - resetPassword(email)          — sends a password-reset email; returns { ok, error }
 *   - updatePassword(newPassword)   — updates password for signed-in user; returns { ok, error }
 *   - signOut()                     — local sign-out (Supabase session cleared)
 *
 * When VITE_SUPABASE_URL/ANON_KEY are not set, status stays 'disabled' and
 * all helpers no-op. The rest of the app continues to use localStorage only.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isCloudEnabled } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [status,  setStatus]  = useState(isCloudEnabled ? 'loading' : 'disabled')

  useEffect(() => {
    if (!isCloudEnabled) return

    let active = true

    // Initial session lookup (resolves magic-link + OAuth redirects via detectSessionInUrl)
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    // Subscribe to all auth state changes
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

  // ── Magic link ───────────────────────────────────────────────────────────────
  const sendMagicLink = useCallback(async (email) => {
    if (!isCloudEnabled) return { ok: false, error: 'Cloud sync is not configured.' }
    const cleanEmail = (email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
        shouldCreateUser: true,
      },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // ── Email + password sign-up ─────────────────────────────────────────────────
  const signUp = useCallback(async (email, password) => {
    if (!isCloudEnabled) return { ok: false, error: 'Cloud sync is not configured.' }
    const cleanEmail = (email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@'))
      return { ok: false, error: 'Please enter a valid email address.' }
    if (!password || password.length < 8)
      return { ok: false, error: 'Password must be at least 8 characters.' }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) return { ok: false, error: error.message }
    // If no session, email confirmation is required (auto-confirm is off)
    if (data.user && !data.session) return { ok: true, confirmationRequired: true }
    return { ok: true }
  }, [])

  // ── Email + password sign-in ─────────────────────────────────────────────────
  const signInWithPassword = useCallback(async (email, password) => {
    if (!isCloudEnabled) return { ok: false, error: 'Cloud sync is not configured.' }
    const cleanEmail = (email || '').trim().toLowerCase()
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    if (!isCloudEnabled) return { ok: false, error: 'Cloud sync is not configured.' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // ── Password reset ───────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email) => {
    if (!isCloudEnabled) return { ok: false, error: 'Cloud sync is not configured.' }
    const cleanEmail = (email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@'))
      return { ok: false, error: 'Please enter a valid email address.' }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin + '/auth/callback?mode=reset',
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // ── Update password (authenticated user) ─────────────────────────────────────
  const updatePassword = useCallback(async (newPassword) => {
    if (!isCloudEnabled) return { ok: false, error: 'Cloud sync is not configured.' }
    if (!newPassword || newPassword.length < 8)
      return { ok: false, error: 'Password must be at least 8 characters.' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // ── Sign out ─────────────────────────────────────────────────────────────────
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
      signUp,
      signInWithPassword,
      signInWithGoogle,
      resetPassword,
      updatePassword,
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
