#!/usr/bin/env node
// Writes the public-domain test EPUB used by the unit tests, for manual and
// end-to-end narration checks:  node scripts/make-sample-epub.mjs out.epub
import { writeFile } from 'node:fs/promises'
import { buildSampleEpub } from '../src/test/sampleEpub.js'

const out = process.argv[2] || 'pride-and-prejudice-sample.epub'
await writeFile(out, buildSampleEpub())
console.log(`wrote ${out}`)
