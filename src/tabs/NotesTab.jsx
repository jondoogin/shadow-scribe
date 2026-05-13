import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import NoteTag from '../components/shared/NoteTag.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import { TAG_CONFIG } from '../data/config.js'
import { fmtDate } from '../utils/date.js'

const today = () => new Date().toISOString().split('T')[0]

export default function NotesTab({ book, onUpdateBook }) {
  const [activeTag,      setActiveTag]      = useState(null)
  const [adding,         setAdding]         = useState(false)
  const [newNote,        setNewNote]        = useState('')
  const [newTag,         setNewTag]         = useState('theme')

  // Edit state
  const [editingId,      setEditingId]      = useState(null)
  const [editText,       setEditText]       = useState('')
  const [editTag,        setEditTag]        = useState('theme')

  // Reflection state
  const [reflectingId,   setReflectingId]   = useState(null)
  const [reflectText,    setReflectText]    = useState('')

  // Deletion state
  const [deletingId,     setDeletingId]     = useState(null)
  const [removingReflId, setRemovingReflId] = useState(null)

  const visible  = activeTag ? book.notes.filter(n => n.tag === activeTag) : book.notes
  const usedTags = [...new Set(book.notes.map(n => n.tag))]

  const dominantTag = (() => {
    if (book.notes.length < 5) return null
    const counts = {}
    for (const n of book.notes) counts[n.tag] = (counts[n.tag] || 0) + 1
    const [top, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? []
    return count >= 3 ? (TAG_CONFIG[top]?.label ?? top).toLowerCase() : null
  })()

  const addNote = () => {
    if (!newNote.trim()) return
    onUpdateBook({
      notes: [...book.notes, {
        id: `n_${Date.now()}`,
        text: newNote.trim(),
        tag: newTag,
        date: today(),
      }],
    })
    setNewNote(''); setAdding(false)
  }

  const startEdit = (note) => {
    setEditingId(note.id)
    setEditText(note.text)
    setEditTag(note.tag)
    setReflectingId(null)
    setDeletingId(null)
    setRemovingReflId(null)
  }

  const saveEdit = (note) => {
    const newText = editText.trim()
    if (!newText) return
    const changed = newText !== note.text || editTag !== note.tag
    onUpdateBook({
      notes: book.notes.map(n => n.id === note.id ? {
        ...n,
        text: newText,
        tag: editTag,
        revisedAt: changed ? today() : n.revisedAt,
      } : n),
    })
    setEditingId(null)
  }

  const deleteNote = (noteId) => {
    onUpdateBook({ notes: book.notes.filter(n => n.id !== noteId) })
    setDeletingId(null)
  }

  const startReflect = (note) => {
    setReflectingId(note.id)
    setReflectText(note.reflection || '')
    setEditingId(null)
    setRemovingReflId(null)
  }

  const saveReflection = (note) => {
    const text = reflectText.trim()
    onUpdateBook({
      notes: book.notes.map(n => n.id === note.id ? {
        ...n,
        reflection:     text || undefined,
        reflectionDate: text ? today() : undefined,
      } : n),
    })
    setReflectingId(null)
    setReflectText('')
  }

  const removeReflection = (noteId) => {
    onUpdateBook({
      notes: book.notes.map(n => n.id === noteId
        ? { ...n, reflection: undefined, reflectionDate: undefined }
        : n
      ),
    })
    setRemovingReflId(null)
  }

  return (
    <div className="max-w-2xl">
      {dominantTag && (
        <p className="text-[11px] text-ink-400 italic mb-4">
          {book.notes.length} notes — mostly {dominantTag}
        </p>
      )}

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
          style={{ color: 'var(--ca, #B8860B)' }}>
          <Ico.Plus /> Capture a thought
        </button>
      </div>

      {adding && (
        <div className="bg-cream-50 border rounded-2xl p-4 mb-5 animate-slide-up" style={{ borderColor:'var(--ca-border, #E8D090)' }}>
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
              <button onClick={addNote} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg btn-accent">Save</button>
            </div>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Ico.Note />}
          title="Your thoughts about this story will gather here."
          body="Theories, favourite lines, confusions, hunches — the companion keeps everything you give it."
          action={
            <button onClick={() => setAdding(true)} className="text-sm font-medium hover:underline" style={{ color: 'var(--ca, #B8860B)' }}>
              Write your first note →
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map(note => {
            const isEditing      = editingId      === note.id
            const isReflecting   = reflectingId   === note.id
            const isDeleting     = deletingId     === note.id
            const isRemovingRefl = removingReflId === note.id

            return (
              <div key={note.id} className="bg-cream-50 rounded-xl border border-ink-200 p-4">

                {isDeleting ? (
                  // ── Delete confirmation ────────────────────────────
                  <div className="animate-fade-in">
                    <p className="text-[13px] text-ink-600 mb-4 leading-relaxed">
                      Remove this thought from the companion?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeletingId(null)}
                        className="text-[12px] text-ink-600 hover:text-ink-800 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
                        Keep it
                      </button>
                      <button onClick={() => deleteNote(note.id)}
                        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white bg-ember hover:bg-ember-light transition-colors">
                        Yes, remove it
                      </button>
                    </div>
                  </div>

                ) : isEditing ? (
                  // ── Edit mode ──────────────────────────────────────
                  <div className="animate-fade-in">
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus
                      className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 bg-white resize-none mb-3" />
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.keys(TAG_CONFIG).map(t => (
                          <button key={t} onClick={() => setEditTag(t)}
                            className={`text-[11px] px-2.5 py-[3px] rounded-full font-medium transition-all ${TAG_CONFIG[t].cls} ${editTag === t ? 'ring-2 ring-gold ring-offset-1' : ''}`}>
                            {TAG_CONFIG[t].label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => { setDeletingId(note.id); setEditingId(null) }}
                        className="text-[11px] text-ink-400 hover:text-ember italic transition-colors">
                        Remove note
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)}
                          className="text-[12px] text-ink-500 hover:text-ink-700 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
                          Cancel
                        </button>
                        <button onClick={() => saveEdit(note)}
                          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg btn-accent">
                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                ) : (
                  // ── Normal view ────────────────────────────────────
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] text-ink-700 leading-relaxed flex-1">{note.text}</p>
                      <NoteTag tag={note.tag} />
                    </div>

                    {/* Reflection display */}
                    {note.reflection && !isReflecting && (
                      <div className="mt-3 pl-3 border-l-2 border-ink-200">
                        <p className="text-[12px] text-ink-500 leading-relaxed italic">{note.reflection}</p>
                        {note.reflectionDate && (
                          <p className="text-[10px] text-ink-300 mt-0.5">{fmtDate(note.reflectionDate)}</p>
                        )}
                      </div>
                    )}

                    {/* Reflection input */}
                    {isReflecting && (
                      <div className="mt-3 pl-3 border-l-2 border-ink-200 animate-fade-in">
                        <textarea value={reflectText} onChange={e => setReflectText(e.target.value)} rows={2}
                          autoFocus
                          placeholder="A later thought…"
                          className="w-full text-[12px] text-ink-600 bg-transparent resize-none outline-none placeholder-ink-300 leading-relaxed" />
                        <div className="flex gap-3 mt-1.5">
                          <button onClick={() => { setReflectingId(null); setReflectText('') }}
                            className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => saveReflection(note)}
                            className="text-[11px] font-medium text-ink-600 hover:text-ink-800 transition-colors">
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-ink-400">{fmtDate(note.date)}</p>
                        {note.revisedAt && (
                          <span className="text-[11px] text-ink-300 italic">· revisited</span>
                        )}
                      </div>
                      {isRemovingRefl ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <span className="text-[11px] text-ink-500 italic">Remove this reflection?</span>
                          <button onClick={() => setRemovingReflId(null)}
                            className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors">
                            Keep it
                          </button>
                          <button onClick={() => removeReflection(note.id)}
                            className="text-[11px] font-medium text-ember hover:text-ember-light transition-colors">
                            Yes
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {!isReflecting && note.reflection && (
                            <button onClick={() => setRemovingReflId(note.id)}
                              className="text-[11px] text-ink-300 hover:text-ember italic transition-colors">
                              remove
                            </button>
                          )}
                          {!isReflecting && (
                            <button onClick={() => startReflect(note)}
                              className="text-[11px] text-ink-300 hover:text-ink-500 italic transition-colors">
                              {note.reflection ? 'edit reflection' : '+ reflect'}
                            </button>
                          )}
                          <button onClick={() => startEdit(note)}
                            className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors">
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
