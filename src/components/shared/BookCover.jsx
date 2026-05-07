import { useState } from 'react'

export default function BookCover({ book, className = '', rounded = 'rounded-lg' }) {
  const [err, setErr] = useState(false)
  const url = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`

  if (!book.isbn || err) {
    return (
      <div
        className={`${className} ${rounded} flex flex-col items-center justify-center overflow-hidden select-none p-3`}
        style={{ background: book.coverBg }}
      >
        <p className="text-white font-serif text-center" style={{ fontSize:'clamp(.55rem,1.3vw,.82rem)', fontWeight:600, lineHeight:1.2, textShadow:'0 1px 3px rgba(0,0,0,.35)', marginBottom:'.3em' }}>
          {book.title}
        </p>
        <p className="text-white/75 font-serif text-center italic" style={{ fontSize:'clamp(.46rem,1vw,.66rem)' }}>
          {book.author}
        </p>
      </div>
    )
  }
  return (
    <img
      src={url}
      onError={() => setErr(true)}
      alt={`${book.title} cover`}
      className={`${className} ${rounded} object-cover`}
    />
  )
}
