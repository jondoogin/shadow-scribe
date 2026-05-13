import { useState } from 'react'

// Cover source chain — tried in order; falls back to gradient on exhaustion
const COVER_SOURCES = [
  isbn => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
  isbn => `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1`,
]

function GradientCover({ book, className, rounded }) {
  return (
    <div
      className={`${className} ${rounded} flex flex-col items-center justify-center overflow-hidden select-none p-3`}
      style={{ background: book.coverBg }}
    >
      <p
        className="text-white font-serif text-center"
        style={{ fontSize:'clamp(.55rem,1.3vw,.82rem)', fontWeight:600, lineHeight:1.2, textShadow:'0 1px 3px rgba(0,0,0,.35)', marginBottom:'.3em' }}
      >
        {book.title}
      </p>
      <p
        className="text-white/75 font-serif text-center italic"
        style={{ fontSize:'clamp(.46rem,1vw,.66rem)' }}
      >
        {book.author}
      </p>
    </div>
  )
}

export default function BookCover({ book, className = '', rounded = 'rounded-lg' }) {
  const [sourceIdx, setSourceIdx] = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [failed,    setFailed]    = useState(false)

  const tryNext = () => {
    if (sourceIdx < COVER_SOURCES.length - 1) {
      setSourceIdx(i => i + 1)
      setLoading(true)
    } else {
      setFailed(true)
    }
  }

  const handleLoad = e => {
    // OpenLibrary returns a 1×1 pixel image on miss
    if (e.target.naturalWidth < 10) { tryNext(); return }
    setLoading(false)
  }

  // Embedded EPUB cover: data URL, loads synchronously — highest priority
  if (book.coverData) {
    return (
      <div className={`${className} ${rounded} overflow-hidden flex-shrink-0`}>
        <img
          src={book.coverData}
          alt={`${book.title} cover`}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  if (!book.isbn || failed) {
    return <GradientCover book={book} className={className} rounded={rounded} />
  }

  return (
    <div className={`${className} ${rounded} overflow-hidden relative bg-ink-100 flex-shrink-0`}>
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-ink-100 to-ink-200 animate-pulse" />
      )}
      <img
        key={sourceIdx}
        src={COVER_SOURCES[sourceIdx](book.isbn)}
        onLoad={handleLoad}
        onError={tryNext}
        alt={`${book.title} cover`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  )
}
