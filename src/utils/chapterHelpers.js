// Chapter type labels for display
const TYPE_LABELS = {
  prologue:  'Prologue',
  epilogue:  'Epilogue',
  interlude: 'Interlude',
  part:      'Pt.',
  section:   'Section',
  chapter:   null, // uses format-based label
}

const FORMAT_LABELS = {
  audiobook: 'Pt.',
  ebook:     'Ch.',
  print:     'Ch.',
}

export function getChapterLabel(ch, format = 'print') {
  const type = ch.type ?? 'chapter'
  if (type === 'prologue') return 'Prologue'
  if (type === 'epilogue') return 'Epilogue'
  if (type === 'interlude') return `Interlude ${ch.num}`
  if (type === 'part') return `Pt. ${ch.num}`
  if (type === 'section') return `Section ${ch.num}`
  // default: format-aware label
  return `${FORMAT_LABELS[format] ?? 'Ch.'} ${ch.num}`
}

export function getChapterShortLabel(ch, format = 'print') {
  const type = ch.type ?? 'chapter'
  if (type === 'prologue') return 'Pro.'
  if (type === 'epilogue') return 'Epi.'
  if (type === 'interlude') return `Int.`
  if (type === 'part') return `Pt. ${ch.num}`
  if (type === 'section') return `§${ch.num}`
  return `${FORMAT_LABELS[format] ?? 'Ch.'} ${ch.num}`
}

export function getChapterWeight(ch) {
  return ch.estimatedLength ?? 1
}

export function getTotalWeight(chapters) {
  return chapters.reduce((sum, ch) => sum + getChapterWeight(ch), 0)
}

export function getWeightedProgress(book) {
  const chapters = book.chapters || []
  if (!chapters.length) return 0
  const completed = chapters.filter(c => c.completed)
  const completedWeight = completed.reduce((s, c) => s + getChapterWeight(c), 0)
  const totalWeight = getTotalWeight(chapters)
  return Math.round((completedWeight / totalWeight) * 100)
}

export function isSpecialChapter(ch) {
  const t = ch.type ?? 'chapter'
  return t === 'prologue' || t === 'epilogue' || t === 'interlude'
}

// Returns chapters grouped into display sections (for books with nested parts)
export function getChapterDisplayGroups(chapters) {
  return chapters
}
