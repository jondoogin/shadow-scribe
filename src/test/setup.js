// Vitest setup: a DOMParser for the EPUB parser (Node has none) and an
// in-memory IndexedDB for the content repository.
import { DOMParser } from 'linkedom'
import 'fake-indexeddb/auto'

globalThis.DOMParser = DOMParser
