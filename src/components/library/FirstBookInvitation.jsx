import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * FirstBookInvitation
 *
 * A calm, atmospheric modal shown to new users after they've dismissed the
 * welcome banner but haven't yet added a real book of their own. Lets them
 * know the seeded books are examples and offers an explicit path forward.
 *
 * Triggered from Library.jsx based on:
 *   - welcomeBanner dismissed
 *   - no books with id starting with "book_" (user-created)
 *   - no recent dismissal (within 7 days)
 *
 * Props:
 *   onAddBook  — called when "Add a book" CTA pressed (navigates to /new)
 *   onDismiss  — called when "Just explore" or close button pressed
 */
export default function FirstBookInvitation({ onAddBook, onDismiss }) {
  const navigate  = useNavigate()
  const dialogRef = useRef()

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Escape to dismiss
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const handleAdd = () => {
    onAddBook()
    navigate('/new')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      style={{ background: 'rgba(28,25,23,.45)', backdropFilter: 'blur(8px)' }}
      onClick={onDismiss}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-book-invitation-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl overflow-hidden modal-sheet animate-slide-up"
        style={{
          background:  'var(--color-card-base)',
          border:      '1px solid var(--color-hairline)',
          boxShadow:   'var(--shadow-modal)',
          maxHeight:   'min(86svh, calc(100dvh - 32px))',
        }}
      >
        <div className="px-7 pt-8 pb-6">
          <div
            className="flex items-center justify-center mb-5"
            aria-hidden
            style={{ fontSize: 18 }}
          >
            <span
              style={{
                background:           'var(--lantern-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
                opacity:              0.9,
              }}
            >
              ✦
            </span>
          </div>

          <h2
            id="first-book-invitation-title"
            className="text-center mb-3"
            style={{
              fontFamily:    'var(--font-serif)',
              fontSize:      'clamp(20px, 4vw, 26px)',
              fontWeight:    400,
              letterSpacing: '-0.01em',
              color:         'var(--color-text-primary)',
              lineHeight:    1.25,
            }}
          >
            Your library begins with you
          </h2>

          <p
            className="text-center italic mb-6 leading-relaxed mx-auto"
            style={{
              fontSize:   14,
              color:      'var(--color-text-secondary)',
              maxWidth:   360,
              lineHeight: 1.65,
            }}
          >
            The books you see are examples — they're here so the companion has something
            to hold while you look around. When you're ready, add a book you're actually
            reading. That's when the companion starts listening.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleAdd}
              className="w-full transition-all"
              style={{
                fontFamily:    'var(--font-serif)',
                fontSize:      14,
                fontWeight:    500,
                color:         'var(--color-bg)',
                background:    'var(--lantern-gradient)',
                padding:       '12px',
                borderRadius:  10,
                border:        'none',
                letterSpacing: '0.01em',
                cursor:        'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '0.93'
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(196,118,28,0.55), 0 0 16px rgba(168,94,16,.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Add your first book →
            </button>

            <button
              onClick={onDismiss}
              className="w-full transition-colors"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize:   13,
                fontStyle:  'italic',
                color:      'var(--color-ink-400)',
                background: 'transparent',
                padding:    '8px',
                border:     'none',
                cursor:     'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink-600)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-400)' }}
            >
              Just explore for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
