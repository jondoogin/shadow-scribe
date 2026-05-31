/**
 * SignInPage — Full-page auth surface at /signin.
 *
 * Redirects to /library when already signed in or immediately after sign-in.
 * Renders SignInPanel in a centered layout with a brief heading.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import SignInPanel from '../components/auth/SignInPanel.jsx'

export default function SignInPage() {
  const { status } = useAuth()
  const navigate   = useNavigate()

  // Redirect once signed in (handles both already-signed-in and post-auth flows)
  useEffect(() => {
    if (status === 'signed-in') navigate('/library', { replace: true })
  }, [status, navigate])

  return (
    <div className="max-w-[1000px] mx-auto px-5 sm:px-10 py-14">
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1
          className="font-serif mb-1"
          style={{ fontSize: 22, color: 'var(--color-ink-700)', fontWeight: 600 }}
        >
          Your reading companion.
        </h1>
        <p
          className="italic mb-7"
          style={{ fontSize: 13, color: 'var(--color-ink-400)', lineHeight: 1.55 }}
        >
          Sign in to sync your library and notes across devices.
        </p>
        <SignInPanel />
      </div>
    </div>
  )
}
