import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import SectionLabel from '../components/shared/SectionLabel.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import RelationshipMap from '../components/dashboard/RelationshipMap.jsx'

function CharCard({ ch }) {
  const [open, setOpen] = useState(false)
  const aliveCls = ch.alive
    ? 'text-sage bg-sage-bg border-sage-pale'
    : 'text-ink-500 bg-ink-100 border-ink-200'
  return (
    <div className="bg-cream-50 rounded-xl border border-ink-200 overflow-hidden">
      <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setOpen(o => !o)}>
        <div className="w-9 h-9 rounded-full bg-gold-bg border border-gold-border flex items-center justify-center text-gold flex-shrink-0">
          <Ico.User />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-sm font-semibold text-ink-900">{ch.name}</p>
            <span className={`text-[10px] font-medium px-2 py-[2px] rounded-full border ${aliveCls}`}>{ch.status}</span>
            {ch.spoilerSafe && (
              <span className="text-[10px] bg-sage-bg text-sage border border-sage-pale px-1.5 py-[2px] rounded-full inline-flex items-center gap-0.5">
                <Ico.Eye /> Spoiler-safe
              </span>
            )}
          </div>
          <p className="text-[12px] text-ink-500 mt-0.5 truncate">{ch.role} · Last seen {ch.lastSeen}</p>
        </div>
        <span className={`text-ink-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}><Ico.Down /></span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-ink-100 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionLabel>Allegiance</SectionLabel>
              <p className="text-[13px] text-ink-700">{ch.allegiance}</p>
            </div>
            <div>
              <SectionLabel>Last seen</SectionLabel>
              <p className="text-[13px] text-ink-700">{ch.lastSeen}</p>
            </div>
          </div>
          <p className="text-[13px] text-ink-600 leading-relaxed">{ch.description}</p>
        </div>
      )}
    </div>
  )
}

export default function CharactersTab({ book }) {
  if (!book.characters.main.length && !book.characters.secondary.length) {
    return (
      <EmptyState
        icon={<Ico.User />}
        title="No characters yet"
        body="Characters will find their way here as you make your way through the story."
      />
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      {book.characters.main.length > 0 && (
        <div>
          <SectionHeading>Main Characters</SectionHeading>
          <div className="space-y-2">{book.characters.main.map(ch => <CharCard key={ch.id} ch={ch} />)}</div>
        </div>
      )}
      {book.characters.secondary.length > 0 && (
        <div>
          <SectionHeading>Secondary Characters</SectionHeading>
          <div className="space-y-2">{book.characters.secondary.map(ch => <CharCard key={ch.id} ch={ch} />)}</div>
        </div>
      )}
      <RelationshipMap book={book} />
    </div>
  )
}
