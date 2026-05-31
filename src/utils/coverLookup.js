// coverLookup.js
// Fetches the best available cover URL for a book via the Google Books API.
// Returns a URL string or null. Never throws.
// No API key required for the volume queries used here.

async function _queryGoogleBooks(q) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&fields=items(volumeInfo/imageLinks)`,
      { signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.items?.length) return null

    for (const item of data.items) {
      const links = item.volumeInfo?.imageLinks
      if (!links) continue
      const raw = links.thumbnail || links.smallThumbnail || ''
      if (!raw) continue
      // Normalise: https, larger image (zoom 0), remove curl artifact
      return raw
        .replace(/^http:/, 'https:')
        .replace('zoom=1', 'zoom=0')
        .replace('&edge=curl', '')
    }
    return null
  } catch {
    return null
  }
}

/**
 * fetchCoverUrl(title, author, isbn?)
 *
 * Tries ISBN lookup first (most precise), then title+author.
 * Returns a cover image URL string, or null if nothing is found.
 */
export async function fetchCoverUrl(title, author, isbn = null) {
  try {
    // ISBN query is most precise — try it first
    if (isbn) {
      const clean = isbn.replace(/[-\s]/g, '')
      const url = await _queryGoogleBooks(`isbn:${clean}`)
      if (url) return url
    }

    // Title+author fallback — truncated to keep query manageable
    if (title) {
      const t = encodeURIComponent(title.slice(0, 80))
      const a = author
        ? `+inauthor:${encodeURIComponent(author.slice(0, 60))}`
        : ''
      const url = await _queryGoogleBooks(`intitle:${t}${a}`)
      if (url) return url
    }

    return null
  } catch {
    return null
  }
}
