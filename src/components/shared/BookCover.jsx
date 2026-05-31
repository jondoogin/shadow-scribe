import { useState, useEffect } from 'react'

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

// Build the ordered URL source list for a book.
// coverUrl (stored Google Books lookup) is tried first, then ISBN-based sources.
function buildSources(book) {
  const list = []
  if (book.coverUrl) list.push(() => book.coverUrl)
  if (book.isbn) {
    list.push(() => `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`)
    list.push(() => `https://books.google.com/books/content?vid=ISBN:${book.isbn}&printsec=frontcover&img=1&zoom=1`)
  }
  return list
}

export default function BookCover({ book, className = '', rounded = 'rounded-lg' }) {
  const [sourceIdx, setSourceIdx] = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [failed,    setFailed]    = useState(false)

  // Reset the source chain whenever the book's cover data changes (e.g. after
  // a background lookup resolves and coverUrl is stored for the first time).
  useEffect(() => {
    setSourceIdx(0)
    setLoading(true)
    setFailed(false)
  }, [book.id, book.coverUrl, book.isbn])

  const sources = buildSources(book)

  const tryNext = () => {
    if (sourceIdx < sources.length - 1) {
      setSourceIdx(i => i + 1)
      setLoading(true)
    } else {
      setFailed(true)
    }
  }

  const handleLoad = e => {
    // OpenLibrary returns a 1×1 pixel image on miss; treat as failure
    if (e.target.naturalWidth < 10) { tryNext(); return }
    setLoading(false)
  }

  // Embedded EPUB cover: base64 data URL — highest priority, no network request
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

  // No URL sources available, or all sources exhausted → gradient fallback
  if (!sources.length || failed) {
    return <GradientCover book={book} className={className} rounded={rounded} />
  }

  return (
    <div className={`${className} ${rounded} overflow-hidden relative bg-ink-100 flex-shrink-0`}>
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-ink-100 to-ink-200 animate-pulse" />
      )}
      <img
        key={sourceIdx}
        src={sources[sourceIdx]()}
        onLoad={handleLoad}
        onError={tryNext}
        alt={`${book.title} cover`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  )
}
