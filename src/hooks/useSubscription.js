/**
 * useSubscription — reads the current user's subscription tier from Supabase.
 *
 * Returns:
 *   subscription  — raw row from `subscriptions` table, or null
 *   isPro         — true if tier === 'companion_plus' and status === 'active'
 *   loading       — true while the initial fetch is in flight
 *
 * If no row exists, treats the user as free tier (default state for all users).
 * When signed out or cloud not configured, returns { subscription: null, isPro: false }.
 */

import { useState, useEffect } from 'react'
import { supabase, isCloudEnabled } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export function useSubscription() {
  const { user, status } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!isCloudEnabled || status !== 'signed-in' || !user?.id) {
      setSubscription(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('subscriptions')
      .select('tier, status, current_period_end, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        // No row → free tier by default
        setSubscription(data ?? { tier: 'free', status: 'active' })
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id, status])

  const isPro = subscription?.tier === 'companion_plus' && subscription?.status === 'active'

  return { subscription, loading, isPro }
}
