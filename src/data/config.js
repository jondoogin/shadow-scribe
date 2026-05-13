export const STATUS_CONFIG = {
  reading:  { label:'Reading',      dot:'bg-sage',      text:'text-sage',      bg:'bg-sage-bg',    border:'border-sage-pale'    },
  finished: { label:'Finished',     dot:'bg-gold',      text:'text-gold',      bg:'bg-gold-bg',    border:'border-gold-border'  },
  paused:   { label:'Paused',       dot:'bg-ink-400',   text:'text-ink-500',   bg:'bg-ink-100',    border:'border-ink-200'      },
  want:     { label:'Want to Read', dot:'bg-sienna',    text:'text-sienna',    bg:'bg-sienna-bg',  border:'border-sienna-pale'  },
}

export const MOOD_CONFIG = {
  sage:   { label: 'Forest Sage',  descriptor: 'reflective and patient',  color: '#3A6647', ring: '#D4E8DA', description: 'A grounded, natural reading atmosphere.' },
  ember:  { label: 'Ember',        descriptor: 'intimate and tense',      color: '#9B2335', ring: '#F5D0D4', description: 'Intense, dramatic, emotionally charged.' },
  ink:    { label: 'Dark Ink',     descriptor: 'quiet and literary',      color: '#44403C', ring: '#E7E5E0', description: 'Minimal, literary, quietly serious.' },
  sienna: { label: 'Warm Sienna',  descriptor: 'earthy and unhurried',    color: '#8B4513', ring: '#F0D5C0', description: 'Earthy and intimate, like aged pages.' },
  gold:   { label: 'Antique Gold', descriptor: 'warm and luminous',       color: '#B8860B', ring: '#E8D090', description: 'Classic literary warmth and richness.' },
  steel:  { label: 'Cold Steel',   descriptor: 'cool and analytical',     color: '#2D4A6B', ring: '#C8D8EE', description: 'Cool academic precision, analytical distance.' },
}

export const CHAPTER_TYPES = {
  chapter:   { label: 'Chapter',   shortLabel: 'Ch.',      selectable: true  },
  part:      { label: 'Part',      shortLabel: 'Pt.',      selectable: true  },
  section:   { label: 'Section',   shortLabel: '§',        selectable: true  },
  prologue:  { label: 'Prologue',  shortLabel: 'Pro.',     selectable: false },
  epilogue:  { label: 'Epilogue',  shortLabel: 'Epi.',     selectable: false },
  interlude: { label: 'Interlude', shortLabel: 'Int.',     selectable: false },
}

export const STRUCTURE_TYPES = [
  { k: 'chapter', l: 'Chapters',  desc: 'Numbered chapters (most books)' },
  { k: 'part',    l: 'Parts',     desc: 'Numbered parts or acts' },
  { k: 'section', l: 'Sections',  desc: 'Named or numbered sections' },
]

export const TAG_CONFIG = {
  theory:    { label:'Theory',    cls:'tag-theory'    },
  favorite:  { label:'Favourite', cls:'tag-favorite'  },
  confusing: { label:'Confusing', cls:'tag-confusing' },
  theme:     { label:'Theme',     cls:'tag-theme'     },
  character: { label:'Character', cls:'tag-character' },
  quote:     { label:'Quote',     cls:'tag-quote'     },
}
