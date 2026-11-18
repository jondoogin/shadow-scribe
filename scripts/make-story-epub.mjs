#!/usr/bin/env node
// Writes the original test story used by the visual journey tests and demo:
//   node scripts/make-story-epub.mjs gull-point.epub
import { writeFile } from 'node:fs/promises'
import { buildStoryEpub } from '../src/test/storyEpub.js'

const out = process.argv[2] || 'gull-point.epub'
await writeFile(out, buildStoryEpub())
console.log(`wrote ${out}`)
