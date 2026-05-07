import { TAG_CONFIG } from '../../data/config.js'

export default function NoteTag({ tag, onClick, active }) {
  const c = TAG_CONFIG[tag] ?? { label: tag, cls: 'tag-theme' }
  return (
    <button
      onClick={onClick}
      className={`${c.cls} text-[11px] font-medium px-2.5 py-[3px] rounded-full transition-all ${active ? 'ring-2 ring-offset-1 ring-gold' : 'opacity-80 hover:opacity-100'}`}
    >
      {c.label}
    </button>
  )
}
