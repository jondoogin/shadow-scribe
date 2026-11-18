// Sample content for the design lab. All titles are public domain, and every
// companion line stays inside the reader's current position (spoiler shield).

export const BOOKS = [
  {
    id: 'pp', title: 'Pride and Prejudice', author: 'Jane Austen',
    palette: ['#E86A5C', '#F4B6A0', '#5E8C6A'], status: 'listening',
    chapter: 1, chapters: 61, chapterPct: 64, bookPct: 1, minutesLeft: 3,
    sectionTitle: 'Chapter 1',
  },
  {
    id: 'je', title: 'Jane Eyre', author: 'Charlotte Brontë',
    palette: ['#3B4A7A', '#9DB2E0', '#C9A15B'], status: 'reading',
    chapter: 9, chapters: 38, bookPct: 24,
  },
  {
    id: 'md', title: 'Moby-Dick', author: 'Herman Melville',
    palette: ['#1E6A8C', '#7CC6D9', '#E8D8B0'], status: 'reading',
    chapter: 41, chapters: 135, bookPct: 30,
  },
  {
    id: 'gg', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald',
    palette: ['#1D1A3A', '#E3B341', '#4FB3A9'], status: 'listening',
    chapter: 3, chapters: 9, bookPct: 33,
  },
  {
    id: 'fr', title: 'Frankenstein', author: 'Mary Shelley',
    palette: ['#2C3A33', '#A8C5B5', '#D96C4A'], status: 'finished',
    chapter: 24, chapters: 24, bookPct: 100,
  },
  {
    id: 'mm', title: 'Middlemarch', author: 'George Eliot',
    palette: ['#7A4E8C', '#E2C4E8', '#E9A65B'], status: 'next',
    chapter: 0, chapters: 86, bookPct: 0,
  },
]

export const FILTERS = ['All', 'Reading', 'Listening', 'Finished']

// Opening of Pride and Prejudice, Chapter 1 (public domain). The same
// passage the narration benchmark uses.
export const PASSAGE = [
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
  'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
  '“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”',
  'Mr. Bennet replied that he had not.',
  '“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”',
  'Mr. Bennet made no answer.',
  '“Do you not want to know who has taken it?” cried his wife impatiently.',
  '“You want to tell me, and I have no objection to hearing it.”',
  'This was invitation enough.',
]

// Index into PASSAGE of the sentence being narrated right now.
export const NOW_LINE = 4

export const CHAT = [
  { who: 'reader', text: 'Is Mr. Bennet teasing her, or does he genuinely not care?' },
  {
    who: 'companion',
    text: 'So far he answers her questions with silence and lets her do all the talking. “You want to tell me, and I have no objection to hearing it” could be affection dressed as indifference, or the other way round. Worth keeping an eye on.',
  },
]

export const REFLECTION = 'The first line sounds like a rule of the world. By the end of the page it sounds like Mrs. Bennet’s rule.'

export const NOTES = [
  { tag: 'Theory', text: 'The famous first line is ironic: it’s the families who want the man, not the other way round.' },
  { tag: 'Question', text: 'Why does Mr. Bennet let her keep talking?' },
]

export const CHARACTERS = ['Mr. Bennet', 'Mrs. Bennet', 'Mrs. Long', 'Mr. Bingley']

export const TABS = ['Companion', 'Characters', 'Plot', 'Mysteries', 'Notes', 'Discussion']

export const AMBIENT = ['Off', 'Rain', 'Fireplace', 'Ocean', 'Night wind', 'Brown noise']

export const CHAPTERS = [
  { n: 1, title: 'Chapter 1', min: 6 },
  { n: 2, title: 'Chapter 2', min: 7 },
  { n: 3, title: 'Chapter 3', min: 14 },
  { n: 4, title: 'Chapter 4', min: 9 },
]
