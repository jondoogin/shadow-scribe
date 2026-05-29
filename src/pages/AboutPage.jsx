import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useReveal(containerRef) {
  useEffect(() => {
    const els = containerRef.current?.querySelectorAll('.lp-reveal')
    if (!els?.length) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      }),
      { threshold: 0.10, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [containerRef])
}

// ── Drift animation for atmospheric elements ──────────────────────────────────
function useAtmoDrift(ref) {
  useEffect(() => {
    let t = 0
    let raf
    const tick = () => {
      t += 0.0006
      if (ref.current) {
        const x = 30 + Math.sin(t) * 8
        const y = 60 + Math.cos(t * 0.7) * 6
        ref.current.style.backgroundPosition = `${x}% ${y}%`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref])
}

// ── Fake typing animation for exhibit ────────────────────────────────────────
function useTyping(text, active, speed = 38) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!active) return
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) { clearInterval(interval); return }
      setDisplayed(text.slice(0, ++i))
    }, speed)
    return () => clearInterval(interval)
  }, [text, active, speed])
  return displayed
}

// ── Section heading ───────────────────────────────────────────────────────────
function SLabel({ children }) {
  return (
    <p style={{
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--color-text-dim)',
      marginBottom: 20,
    }}>
      {children}
    </p>
  )
}

// ── Gold rule ─────────────────────────────────────────────────────────────────
function GoldRule() {
  return (
    <div style={{
      height: 1,
      background: 'linear-gradient(to right, transparent, rgba(168,94,16,0.3), transparent)',
      margin: '0 auto',
    }} />
  )
}

// ── Residue card ──────────────────────────────────────────────────────────────
function ResidueCard({ when, thought, from, gold = false }) {
  return (
    <div className="lp-residue-card" data-gold={gold}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: gold ? 'var(--color-accent)' : 'var(--color-text-dim)',
        marginBottom: 10,
        opacity: gold ? 0.8 : 0.6,
      }}>
        {when}
      </div>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 14,
        lineHeight: 1.68,
        color: 'var(--color-text-primary)',
        marginBottom: 12,
        flex: 1,
      }}>
        {thought}
      </p>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        color: 'var(--color-text-dim)',
        opacity: 0.7,
      }}>
        {from}
      </div>
    </div>
  )
}

// ── Voice card ────────────────────────────────────────────────────────────────
function VoiceCard({ quote, name, role, delay = 0 }) {
  return (
    <div className="lp-reveal lp-voice" style={{ transitionDelay: `${delay}ms` }}>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 15,
        lineHeight: 1.74,
        color: 'var(--color-text-primary)',
        marginBottom: 18,
      }}>
        "{quote}"
      </p>
      <div>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          display: 'block',
          marginBottom: 2,
        }}>
          {name}
        </span>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 10,
          color: 'var(--color-text-dim)',
        }}>
          {role}
        </span>
      </div>
    </div>
  )
}

// ── Exhibit: live-looking companion demo ──────────────────────────────────────
function Exhibit() {
  const [typed, setTyped] = useState(false)
  const typedText = useTyping(
    'Why does Woland keep choosing the buffoons? He could have anyone.',
    typed,
    32
  )

  return (
    <div className="lp-exhibit">
      {/* Book header */}
      <div className="lp-exhibit-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div className="lp-book-cover" />
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-text-dim)',
              marginBottom: 6,
              opacity: 0.7,
            }}>Now reading</div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              lineHeight: 1.2,
              color: 'var(--color-text-primary)',
              marginBottom: 4,
            }}>The Master and Margarita</div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              marginBottom: 10,
            }}>Mikhail Bulgakov</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                height: 2,
                width: 120,
                background: 'var(--color-separator)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: '59%',
                  height: '100%',
                  background: 'var(--lantern-gradient)',
                  borderRadius: 2,
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-sans)' }}>Ch. 19 · 54 days · 59%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Companion band */}
      <div className="lp-companion-section">
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
            opacity: 0.7,
          }}>
            Chapter 19 of 32. Deeper in now. There are 2 open threads still pulling.
          </span>
        </div>
        <div
          className="lp-companion-input"
          onClick={() => !typed && setTyped(true)}
          style={{ cursor: typed ? 'default' : 'text' }}
        >
          {typed
            ? <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-primary)' }}>
                {typedText}
                {typedText.length < 'Why does Woland keep choosing the buffoons? He could have anyone.'.length && (
                  <span className="lp-cursor" />
                )}
              </span>
            : <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-dim)', opacity: 0.5 }}>
                A thought, a question, a reaction…
              </span>
          }
        </div>
        {typed && typedText.length >= 30 && (
          <div className="lp-companion-response">
            <span style={{ fontSize: 8, color: 'var(--color-accent)', marginRight: 8, opacity: 0.7 }}>✦</span>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}>
              The buffoons are the ones who reveal the truth without meaning to. Woland doesn't need loyal servants — he needs mirrors.
            </span>
          </div>
        )}

        {/* Open questions */}
        <div style={{ marginTop: 16 }}>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
            marginBottom: 8,
            opacity: 0.6,
          }}>Open questions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { text: 'Is Woland the devil — or a metaphor for Soviet repression?', haunted: true },
              { text: 'What happened to the manuscript before it was burned?', haunted: false },
            ].map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 7, color: q.haunted ? 'var(--color-accent)' : 'var(--color-text-dim)', opacity: q.haunted ? 0.85 : 0.4, marginTop: 3 }}>✦</span>
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: 'var(--color-text-secondary)',
                }}>
                  {q.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!typed && (
        <p style={{
          textAlign: 'center',
          marginTop: 16,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          opacity: 0.6,
        }}>
          click the field to speak to the companion →
        </p>
      )}
    </div>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const atmoRef = useRef(null)
  useReveal(containerRef)
  useAtmoDrift(atmoRef)

  return (
    <>
      <style>{`
        /* ── About page layout ── */
        .lp-page { position: relative; }

        /* ── Atmospheric glow ── */
        .lp-atmo {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(ellipse 80% 50% at 30% 60%, var(--color-glow), transparent 70%);
          opacity: 0.35;
          transition: opacity 2s ease;
        }

        /* ── Reveal animation ── */
        .lp-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1);
        }
        .lp-reveal.in { opacity: 1; transform: translateY(0); }

        /* ── Max-width wrapper ── */
        .lp-col { max-width: 720px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
        .lp-col-wide { max-width: 1000px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
        @media (min-width: 640px) { .lp-col, .lp-col-wide { padding: 0 40px; } }

        /* ── Section spacing ── */
        .lp-section { padding: 52px 0; }
        .lp-section-loose { padding: 64px 0; }
        @media (min-width: 640px) {
          .lp-section { padding: 80px 0; }
          .lp-section-loose { padding: 100px 0; }
        }

        /* ── Hero ── */
        .lp-hero {
          min-height: calc(100svh - 56px);
          display: flex;
          align-items: center;
          padding: 52px 0 72px;
          position: relative;
        }
        @media (min-width: 640px) {
          .lp-hero { padding: 80px 0 100px; }
        }
        .lp-hero::after {
          content: '';
          position: absolute;
          bottom: 0; left: 50%;
          transform: translateX(-50%);
          width: 1px; height: 60px;
          background: linear-gradient(to bottom, var(--color-hairline), transparent);
        }
        .lp-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-sans);
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--color-text-dim);
          margin-bottom: 28px;
        }
        .lp-hero-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--color-accent);
          box-shadow: 0 0 10px var(--color-accent);
          animation: lpDotPulse 3s ease-in-out infinite;
        }
        @keyframes lpDotPulse {
          0%,100% { opacity: 0.6; box-shadow: 0 0 6px var(--color-accent); }
          50%      { opacity: 1;   box-shadow: 0 0 16px var(--color-accent); }
        }
        .lp-hero-title {
          font-family: var(--font-serif);
          font-size: clamp(36px, 6.5vw, 72px);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
          margin-bottom: 28px;
        }
        .lp-hero-title em {
          font-style: italic;
          background: var(--companion-gradient, var(--lantern-gradient));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lp-hero-aside {
          display: flex; align-items: flex-start; gap: 16px;
          margin-bottom: 40px;
          padding: 18px 20px;
          background: var(--color-card-base);
          border: 1px solid var(--color-separator-soft);
          border-left: 2px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
          border-radius: 12px;
          max-width: 520px;
        }
        .lp-hero-aside-label {
          font-family: var(--font-sans);
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--color-accent); opacity: 0.7;
          white-space: nowrap; margin-top: 1px;
        }
        .lp-hero-aside p {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 13px; line-height: 1.68;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .lp-hero-cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          border-radius: 12px;
          font-size: 13px; font-weight: 600;
          background: var(--lantern-gradient);
          color: white;
          border: none; cursor: pointer;
          transition: opacity 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
        }
        .lp-hero-cta:hover {
          opacity: 0.88;
          box-shadow: 0 0 40px rgba(168,94,16,0.30), 0 4px 16px rgba(0,0,0,0.10);
          transform: translateY(-1px);
        }
        .lp-hero-cta:active { transform: scale(0.98); }

        /* ── Thesis (2-col editorial) ── */
        .lp-thesis {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
        }
        @media (min-width: 720px) {
          .lp-thesis { grid-template-columns: 1fr 260px; gap: 64px; }
        }
        .lp-thesis-body p {
          font-family: var(--font-serif);
          font-size: 16px; line-height: 1.78;
          color: var(--color-text-primary);
          margin-bottom: 20px;
        }
        @media (min-width: 640px) {
          .lp-thesis-body p { font-size: 18px; }
        }
        .lp-thesis-body p em { font-style: italic; color: var(--color-text-secondary); }
        .lp-thesis-body p:last-child { margin-bottom: 0; }
        .lp-marginalia {
          border-top: 2px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
          padding-top: 16px;
        }
        .lp-marginalia-label {
          font-family: var(--font-sans);
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--color-text-dim); opacity: 0.6;
          margin-bottom: 12px;
        }
        .lp-marginalia p {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 13px; line-height: 1.72;
          color: var(--color-text-secondary);
          margin-bottom: 10px;
        }

        /* ── Exhibit ── */
        .lp-exhibit {
          max-width: 600px;
          margin: 0 auto;
          background: var(--color-card-base);
          border: 1px solid var(--color-separator-soft);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
        }
        .lp-exhibit-header {
          padding: 24px 24px 20px;
          border-bottom: 1px solid var(--color-separator-soft);
        }
        .lp-book-cover {
          width: 48px; height: 68px;
          background: linear-gradient(135deg, #2a1f16 0%, #3d2e22 100%);
          border-radius: 4px;
          flex-shrink: 0;
          box-shadow: 2px 3px 8px rgba(0,0,0,0.3);
        }
        .lp-companion-section {
          padding: 20px 24px 24px;
        }
        .lp-companion-input {
          background: transparent;
          border-left: 2px solid var(--color-accent);
          padding: 6px 0 6px 16px;
          margin-bottom: 6px;
          min-height: 36px;
          display: flex;
          align-items: center;
        }
        .lp-cursor {
          display: inline-block;
          width: 1px; height: 14px;
          background: var(--color-accent);
          margin-left: 2px;
          vertical-align: middle;
          animation: lpBlink 0.8s step-end infinite;
        }
        @keyframes lpBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        .lp-companion-response {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 0 0 0;
          animation: lpRevealLine 0.7s ease both;
        }
        @keyframes lpRevealLine {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Residue cards ── */
        .lp-residue-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .lp-residue-card {
          display: flex;
          flex-direction: column;
          background: var(--color-card-base);
          border: 1px solid var(--color-separator-soft);
          border-radius: 14px;
          padding: 20px 18px;
          min-height: 140px;
          transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .lp-residue-card:hover {
          border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
          box-shadow: 0 6px 24px rgba(168,94,16,0.08);
          transform: translateY(-2px);
        }
        .lp-residue-card[data-gold="true"] {
          border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
          background: color-mix(in srgb, var(--color-accent) 4%, var(--color-card-base));
        }

        /* ── Voices ── */
        .lp-voices-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 640px) { .lp-voices-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 900px) { .lp-voices-grid { grid-template-columns: repeat(3, 1fr); } }
        .lp-voice {
          border-top: 1px solid var(--color-separator-soft);
          padding-top: 20px;
        }

        /* ── Privacy ── */
        .lp-privacy-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          background: var(--color-accent-dim);
          border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
          font-size: 11px; font-weight: 500;
          color: var(--color-accent);
          margin-bottom: 28px;
        }

        /* ── CTA closer ── */
        .lp-closer {
          text-align: center;
          padding: 64px 0 80px;
          position: relative;
        }
        @media (min-width: 640px) {
          .lp-closer { padding: 100px 0 120px; }
        }
        .lp-closer::before {
          content: '';
          position: absolute; top: 0; left: 50%;
          transform: translateX(-50%);
          width: 1px; height: 60px;
          background: linear-gradient(to bottom, transparent, var(--color-hairline));
        }
        .lp-closer-title {
          font-family: var(--font-serif);
          font-size: clamp(26px, 4vw, 42px);
          font-weight: 400;
          line-height: 1.28;
          letter-spacing: -0.015em;
          color: var(--color-text-primary);
          margin-bottom: 20px;
        }
        .lp-closer-title em {
          font-style: italic;
          color: var(--color-text-secondary);
        }
        .lp-below {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 13px;
          color: var(--color-text-dim);
          margin-top: 18px;
        }
        .lp-below button {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 13px;
          color: var(--color-text-dim);
          background: none; border: none; cursor: pointer;
          text-decoration: underline;
          text-decoration-color: var(--color-hairline);
          text-underline-offset: 3px;
          transition: color 0.3s ease;
        }
        .lp-below button:hover { color: var(--color-text-secondary); }

        /* ── Verse (numbered lines) ── */
        .lp-verses {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px 40px;
          margin-top: 40px;
        }
        @media (min-width: 480px) { .lp-verses { grid-template-columns: repeat(4, 1fr); gap: 0 24px; } }
        .lp-verse {
          font-family: var(--font-serif);
          font-size: 15px;
          line-height: 1.7;
          color: var(--color-text-secondary);
        }
        .lp-verse .lp-num {
          font-family: var(--font-sans);
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--color-text-dim); opacity: 0.5;
          display: block;
          margin-bottom: 8px;
        }

        /* ── Exhibit section wrapper ── */
        .lp-exhibit-wrap {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
        }
        @media (min-width: 900px) {
          .lp-exhibit-wrap { grid-template-columns: 1fr 1fr; gap: 64px; }
        }
        .lp-exhibit-copy h2 {
          font-family: var(--font-serif);
          font-size: clamp(24px, 3.5vw, 36px);
          font-weight: 400;
          line-height: 1.22;
          letter-spacing: -0.015em;
          color: var(--color-text-primary);
          margin-bottom: 20px;
        }
        .lp-exhibit-copy h2 em {
          font-style: italic;
          color: var(--color-text-secondary);
        }
        .lp-exhibit-copy p {
          font-family: var(--font-serif);
          font-size: 15px; line-height: 1.78;
          color: var(--color-text-secondary);
          margin-bottom: 14px;
        }
        .lp-exhibit-copy p:last-child { margin-bottom: 0; }
      `}</style>

      {/* Atmospheric layer */}
      <div ref={atmoRef} className="lp-atmo" />

      <div className="lp-page" ref={containerRef}>

        {/* ── 1. Hero — the room ─────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-col">
            <div className="lp-reveal" style={{ transitionDelay: '0ms' }}>
              <div className="lp-hero-eyebrow">
                <div className="lp-hero-dot" />
                The reading room · open
              </div>
            </div>

            <h1 className="lp-reveal lp-hero-title" style={{ transitionDelay: '80ms' }}>
              Return to a room<br />
              that <em>remembers</em><br />
              what you were reading.
            </h1>

            <div className="lp-reveal" style={{ transitionDelay: '200ms', maxWidth: 520, marginBottom: 32 }}>
              <div className="lp-hero-aside">
                <div className="lp-hero-aside-label">Companion · still here</div>
                <p>
                  You left off on chapter nineteen. The questions you've been carrying — they're not getting smaller. I've kept them where you put them.
                </p>
              </div>
            </div>

            <div className="lp-reveal" style={{ transitionDelay: '300ms' }}>
              <button className="lp-hero-cta" onClick={() => navigate('/new')}>
                Open the room ✦
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. Thesis ─────────────────────────────────────────────────────── */}
        <section className="lp-section">
          <div className="lp-col">
            <div className="lp-thesis">
              <div className="lp-thesis-body lp-reveal">
                <p>
                  Lantern is not an app for reading.
                  It is a <em>room</em> you read in — and the room
                  remains the same room each time you return.
                </p>
                <p>
                  Threads stay where you left them. Marginalia keep their handwriting.
                  The companion — a quiet intelligence embedded in the environment itself —
                  remembers what you were thinking last Tuesday, and is content to wait.
                </p>
              </div>
              <div className="lp-marginalia lp-reveal" style={{ transitionDelay: '120ms' }}>
                <div className="lp-marginalia-label">A note from the editors</div>
                <p>We built Lantern for the kind of reading that takes weeks. Sometimes months.</p>
                <p>The kind where a single sentence on a Tuesday keeps surfacing on Friday.</p>
                <p>The kind that <em>accumulates</em>.</p>
              </div>
            </div>
          </div>
        </section>

        <GoldRule />

        {/* ── 3. The reader's quiet problem ─────────────────────────────────── */}
        <section className="lp-section">
          <div className="lp-col">
            <div className="lp-reveal">
              <SLabel>The reader's quiet problem</SLabel>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(26px, 3.5vw, 40px)',
                fontWeight: 400,
                lineHeight: 1.18,
                letterSpacing: '-0.015em',
                color: 'var(--color-text-primary)',
                marginBottom: 0,
              }}>
                The story waits.<br />
                <em style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                  Lantern remembers the thread.
                </em>
              </h2>
            </div>
            <div className="lp-verses">
              {[
                { num: 'i.', text: 'Readers pause.\nDays become weeks.' },
                { num: 'ii.', text: 'Characters blur.\nNames start to drift.' },
                { num: 'iii.', text: 'Theories fade.\nQuestions lose shape.' },
                { num: 'iv.', text: 'The thread thins.\nThe book grows quiet.' },
              ].map((v, i) => (
                <div
                  key={i}
                  className="lp-verse lp-reveal"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <span className="lp-num">{v.num}</span>
                  {v.text.split('\n').map((line, j) => (
                    <span key={j}>{line}{j === 0 && <br />}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <GoldRule />

        {/* ── 4. Exhibit ────────────────────────────────────────────────────── */}
        <section className="lp-section-loose" id="exhibit">
          <div className="lp-col-wide">
            <div className="lp-exhibit-wrap">
              <div className="lp-exhibit-copy lp-reveal">
                <SLabel>An exhibit</SLabel>
                <h2>
                  Fifty-four days<br />
                  with one book.<br />
                  <em>The room has been keeping watch.</em>
                </h2>
                <p>
                  A reader in Edinburgh has been with <em>The Master and Margarita</em> since late March.
                  The questions she's been carrying — they're not getting smaller.
                  Lantern has been holding them where she put them.
                </p>
                <p>
                  The companion is not a chatbot. It is a presence — a way the room itself notices things,
                  and waits to be noticed back.
                </p>
              </div>
              <div className="lp-reveal" style={{ transitionDelay: '160ms' }}>
                <Exhibit />
              </div>
            </div>
          </div>
        </section>

        <GoldRule />

        {/* ── 5. Residue — what the room remembers ──────────────────────────── */}
        <section className="lp-section-loose">
          <div className="lp-col-wide">
            <div className="lp-reveal" style={{ marginBottom: 40 }}>
              <SLabel>What the room remembers, between visits</SLabel>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 400,
                lineHeight: 1.22,
                letterSpacing: '-0.015em',
                color: 'var(--color-text-primary)',
                maxWidth: '22ch',
              }}>
                Threads of attention that have not resolved themselves.
              </h2>
            </div>

            <div className="lp-residue-grid lp-reveal" style={{ transitionDelay: '120ms' }}>
              <ResidueCard
                when="held · 41 days"
                thought="Is Woland the devil — or a metaphor for Soviet repression?"
                from="The Master and Margarita · ch. 19"
                gold
              />
              <ResidueCard
                when="last touched · Tuesday"
                thought="The way Ames keeps writing letters his son will read at thirty. It's not a device. It's an act of trust."
                from="Gilead · pg. 84"
              />
              <ResidueCard
                when="drifting · 19 days"
                thought="The woman without a shadow at the theatre — never returned to."
                from="The Master and Margarita · ch. 12"
              />
              <ResidueCard
                when="held · 6 days"
                thought="Stoner's calm in the face of his own diminishment is the most unsettling thing in the book."
                from="Stoner · ch. 14"
              />
              <ResidueCard
                when="returning · 4 weeks"
                thought="A character keeps coming back to me in the mornings. I don't have a name for what she is yet."
                from="Austerlitz · marginalia"
                gold
              />
              <ResidueCard
                when="drifting · 33 days"
                thought="Why does Pilate's headache return whenever the moon does?"
                from="The Master and Margarita · ch. 26"
              />
            </div>

            <p className="lp-reveal" style={{
              transitionDelay: '200ms',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--color-text-dim)',
              marginTop: 32,
              maxWidth: '55ch',
            }}>
              Lantern does not file your thoughts away. It leaves them out on the desk,
              in the order you left them — so that returning is a recognition, not a re-opening.
            </p>
          </div>
        </section>

        <GoldRule />

        {/* ── 6. Reader voices ─────────────────────────────────────────────── */}
        <section className="lp-section-loose">
          <div className="lp-col-wide">
            <div className="lp-reveal" style={{ marginBottom: 56 }}>
              <SLabel>Reader voices</SLabel>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                fontSize: 'clamp(26px, 3.5vw, 36px)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary)',
                maxWidth: '20ch',
              }}>
                Quiet notes from{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                  slow readers
                </em>.
              </h2>
            </div>
            <div className="lp-voices-grid">
              <VoiceCard
                quote="It is the first thing on my screen that feels older than I am. I find myself reading more carefully because of it."
                name="A. Mendez"
                role="essayist · with Lantern, 8 months"
                delay={0}
              />
              <VoiceCard
                quote="I had been reading Austerlitz for nearly a year. Lantern was the first place I found that did not ask me to hurry."
                name="H. Wren"
                role="translator · with Lantern, 1 year"
                delay={80}
              />
              <VoiceCard
                quote="A friend described it as a room where her questions wait for her. I think that is exactly right."
                name="P. Iyer"
                role="reader · with Lantern, 14 months"
                delay={160}
              />
              <VoiceCard
                quote="I came expecting a tool. I stayed because it felt like a place — quiet, lamp on, slightly haunted."
                name="L. Okafor"
                role="poet · with Lantern, 3 months"
                delay={80}
              />
              <VoiceCard
                quote="The companion does not interrupt. It notices. Two months in, I realised it had been doing that the whole time."
                name="M. Tanaka"
                role="biographer · with Lantern, 9 months"
                delay={160}
              />
              <VoiceCard
                quote="I do not finish every book I begin. Lantern lets that be true, without shame, and keeps the thread warm."
                name="D. Halberstam"
                role="critic · with Lantern, 6 months"
                delay={240}
              />
            </div>
          </div>
        </section>

        <GoldRule />

        {/* ── 7. Privacy ───────────────────────────────────────────────────── */}
        <section className="lp-section">
          <div className="lp-col" style={{ textAlign: 'center' }}>
            <div className="lp-reveal">
              <div className="lp-privacy-badge">🔒 Stays on your device</div>
            </div>
            <h2 className="lp-reveal" style={{
              transitionDelay: '80ms',
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: 400,
              lineHeight: 1.28,
              letterSpacing: '-0.015em',
              color: 'var(--color-text-primary)',
              marginBottom: 20,
            }}>
              No account. No server.<br />No one reading your notes but you.
            </h2>
            <p className="lp-reveal" style={{
              transitionDelay: '160ms',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 15,
              lineHeight: 1.78,
              color: 'var(--color-text-secondary)',
              maxWidth: '48ch',
              margin: '0 auto',
            }}>
              Everything in Lantern lives in your browser. Your notes, your theories,
              your reading history — none of it is transmitted anywhere.
              There is no cloud. There is no account.
              It's yours, the way a notebook is yours.
            </p>
          </div>
        </section>

        {/* ── 8. Closer ────────────────────────────────────────────────────── */}
        <section>
          <div className="lp-col">
            <div className="lp-closer">
              <h2 className="lp-reveal lp-closer-title">
                The room is open.<br />
                The lamp is on.<br />
                Your books — and the thoughts<br />
                you left in them —<br />
                are <em>where you left them</em>.
              </h2>
              <div className="lp-reveal" style={{ transitionDelay: '100ms' }}>
                <button className="lp-hero-cta" onClick={() => navigate('/new')}>
                  Open the room ↘
                </button>
              </div>
              <p className="lp-reveal lp-below" style={{ transitionDelay: '200ms' }}>
                No trial. No checklist. Bring a book you've been carrying.
                Or{' '}
                <button onClick={() => navigate('/library')}>
                  return to your library
                </button>
                .
              </p>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
