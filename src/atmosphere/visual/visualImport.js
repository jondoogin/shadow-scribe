// Import a .lantern-visuals package for a book: open, check, store.
import { openVisualPackage, checkImageBlob } from './visualPackage.js'
import { saveVisualSet } from '../../content/contentRepository.js'

/**
 * @param {File} file
 * @param {{ contentId: string }} book
 * @param {{ parserVersion?: number, sections?: Array<{id}> }|null} meta  stored content meta for the book
 * @returns {{ id, count, totalBytes, warnings }}
 */
export async function importVisualPackage(file, book, meta, onProgress) {
  if (!book?.contentId) throw new Error('Link this book’s EPUB first: paintings follow the book’s text.')
  const pkg = await openVisualPackage(file, {
    contentId: book.contentId,
    parserVersion: meta?.parserVersion,
    sectionIds: meta?.sections?.map(s => s.id),
  })
  const res = await saveVisualSet(pkg.id, pkg.manifest, pkg.images, async (img) => {
    const blob = await pkg.getBlob(img.file)
    if (!(await checkImageBlob(blob))) throw new Error(`Painting ${img.id} is not a readable image.`)
    const strokes = img.strokes ? await pkg.getBlob(img.strokes) : null
    const thumb = img.thumb ? await pkg.getBlob(img.thumb) : null
    return { blob, strokes, thumb }
  }, onProgress)
  return { id: pkg.id, count: pkg.images.length, totalBytes: res.totalBytes, warnings: pkg.warnings, manifest: pkg.manifest }
}
