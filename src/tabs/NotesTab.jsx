import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import NoteTag from '../components/shared/NoteTag.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { TAG_CONFIG } from '../data/config.js'
import { fmtDate } from '../utils/date.js'

export default function NotesTab({ book, onUpdateBook }) {
  const [activeTag, setActiveTag] = useState(null)
  const [adding,   setAdding]     = useState(false)
  const [newNote,  setNewNote]    = useState('')
  const [newTag,   setNewTag]     = useState('theme')

  const visible  = activeTag ? book.notes.filter(n => n.tag === activeTag) : book.notes
  const usedTags = [...new Set(book.notes.map(n => n.tag))]

  const addNote = () => {
    if (!newNote.trim()) return
    onUpdateBook({
      notes: [...book.notes, {
        id: `n_${Date.now()}`,
        text: newNote.trim(),
        tag: newTag,
        date: new Date().toISOString().split('T')[0],
      }],
    })
    setNewNote(''); setAdding(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setActiveTag(null)}
            className={`text-[11px] px-2.5 py-[3px] rounded-full border font-medium transition-all ${
              !activeTag ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
            }`}>
            All
          </button>
          {usedTags.map(t => (
            <NoteTag key={t} tag={t} onClick={() => setActiveTag(t === activeTag ? null : t)} active={activeTag === t} />
          ))}
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[12px] font-semibold hover:opacity-75 transition-opacity"
          style={{ color:'var(--ca, #B8860B)' }}>
          <Ico.Plus /> Capture a thought
        </button>
      </div>

      {adding && (
        <div className="bg-cream-50 border border-gold-border rounded-2xl p-4 mb-5 animate-slide-up">
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3}
            placeholder="Write a note, theory, favourite quote, or question…"
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-400 bg-white resize-none transition-all mb-3" />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5 flex-wrap flex-1">
              {Object.keys(TAG_CONFIG).map(t => (
                <button key={t} onClick={() => setNewTag(t)}
                  className={`text-[11px] px-2.5 py-[3px] rounded-full font-medium transition-all ${TAG_CONFIG[t].cls} ${newTag === t ? 'ring-2 ring-gold ring-offset-1' : ''}`}>
                  {TAG_CONFIG[t].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setAdding(false)} className="text-[12px] text-ink-500 hover:text-ink-700 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">Cancel</button>
              <button onClick={addNote} className="text-[12px] font-semibold text-white bg-gold px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Ico.Note />}
          title="Nothing written down yet"
          body="Theories, favourite lines, confusions, hunches — everything is worth keeping."
          action={
            <button onClick={() => setAdding(true)} className="text-sm font-medium hover:underline" style={{ color:'var(--ca, #B8860B)' }}>
              Write your first note →
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map(note => (
            <div key={note.id} className="bg-cream-50 rounded-xl border border-ink-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] text-ink-700 leading-relaxed flex-1">{note.text}</p>
                <NoteTag tag={note.tag} />
              </div>
              <p className="text-[10px] text-ink-400 mt-2.5">{fmtDate(note.date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
