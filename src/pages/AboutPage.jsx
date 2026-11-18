import { Link } from 'react-router-dom'

// About Lantern: one screen, in the Catalogue style. The long scrolling
// landing page (Session 49 onward) was cut in the declutter pass; git has it.
export default function AboutPage() {
  return (
    <main className="cat c2">
      <article className="c2-card" style={{ marginTop: 24 }}>
        <div className="c2-card-head">
          <span className="c2-call">LANTERN</span>
          <span className="c2-label">About</span>
        </div>
        <h1 className="c2-title">A room that remembers what you were reading.</h1>
        <p style={{ marginTop: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          Lantern keeps a companion for each book: the chapters you have reached,
          the people you have met, the questions still open and the notes you wrote.
          Come back after a week or a month and it is all where you left it.
        </p>
        <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
          <li><b>Never ahead of you.</b> Everything past your chapter stays sealed until you get there.</li>
          <li><b>Read or listen.</b> Link a DRM-free EPUB to read it here or listen to it narrated.</li>
          <li><b>Yours alone.</b> Your library lives in this browser. Book text and audio never leave the device.</li>
        </ul>
        <div className="c2-actions" style={{ marginTop: 22 }}>
          <Link to="/library" className="c2-btn c2-btn--primary">Open your library</Link>
        </div>
      </article>
    </main>
  )
}
