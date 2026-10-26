// Spoiler-aware labels for narration/reading sections.
// Strict spoiler mode never shows titles of chapters the reader hasn't reached
// in their companion; relaxed/full show the book's own titles.

export function sectionLabel(section, index, book) {
  const nums = section.chapterNums || []
  const reached = book?.currentChapter ?? 0
  const ahead = nums.length > 0 && Math.min(...nums) > reached
  if (book?.spoilerMode === 'strict' && ahead) return `Section ${index + 1}`
  return section.title || (nums.length ? `Chapter ${nums[0]}` : `Section ${index + 1}`)
}

/** Companion chapter the reader has reached by listening/reading into `section` (or null). */
export function chapterReached(section, book) {
  const nums = section?.chapterNums || []
  if (!nums.length) return null
  const max = Math.max(...nums)
  return max > (book?.currentChapter ?? 0) ? max : null
}

export function formatClock(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const s = Math.floor(sec % 60), m = Math.floor(sec / 60) % 60, h = Math.floor(sec / 3600)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export function formatDuration(sec) {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}

export function formatBytes(b) {
  if (!b) return '0 MB'
  return b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(0.1, b / 1e6).toFixed(1)} MB`
}
