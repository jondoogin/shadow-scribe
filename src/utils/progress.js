export function getProgress(book) {
  return Math.round(
    (book.chapters.filter(c => c.completed).length / book.totalChapters) * 100
  )
}
