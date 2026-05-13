import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import SectionLabel from '../components/shared/SectionLabel.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'
import RelationshipMap from '../components/dashboard/RelationshipMap.jsx'
import { getCharacterView, getEffectiveMode } from '../utils/spoiler.js'
import { useSettings } from '../context/SettingsContext.jsx'

const REL_TYPES = ['love', 'ally', 'tension', 'hierarchy', 'neutral']

function deriveAlive(statusStr) {
  const s = (statusStr || '').toLowerCase()
  return !s.includes('deceased') && !s.includes('dead')
}

// ── Add Character inline form ─────────────────────────────────────────────

function AddCharForm({ book, onUpdateBook, onClose }) {
  const [form, setForm] = useState({
    name: '', role: '', type: 'main',
    status: 'Alive', allegiance: '', description: '', revealChapter: '',
  })
  const [showMore, setShowMore] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const canSave = form.name.trim() && form.role.trim()

  const save = () => {
    if (!canSave) return
    const rc = form.revealChapter ? parseInt(form.revealChapter) : null
    const newChar = {
      id:            `char_${Date.now()}`,
      name:          form.name.trim(),
      role:          form.role.trim(),
      status:        form.status.trim() || 'Alive',
      allegiance:    form.allegiance.trim() || 'Unknown',
      lastSeen:      rc ? `Ch. ${rc}` : null,
      description:   form.description.trim(),
      spoilerSafe:   !rc,
      alive:         deriveAlive(form.status),
      revealChapter: rc,
      userAdded:     true,
    }
    const chars = book.characters
    onUpdateBook({
      characters: {
        ...chars,
        main:      form.type === 'main'      ? [...chars.main,      newChar] : chars.main,
        secondary: form.type === 'secondary' ? [...chars.secondary, newChar] : chars.secondary,
      },
    })
    onClose()
  }

  const inputCls = 'w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 placeholder-ink-400 bg-white'

  return (
    <div className="bg-cream-50 border rounded-2xl p-4 mb-5 animate-slide-up" style={{ borderColor:'var(--ca-border, #E8D090)' }}>
      <div className="space-y-3 mb-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Name</label>
            <input value={form.name} onChange={set('name')} autoFocus
              placeholder="Character name" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Role</label>
            <input value={form.role} onChange={set('role')}
              placeholder="e.g. Protagonist" className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['main', 'secondary'].map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`text-[11px] px-3 py-1 rounded-full font-medium transition-all border ${
                form.type === t
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
              }`}>
              {t === 'main' ? 'Main' : 'Secondary'}
            </button>
          ))}
          <button onClick={() => setShowMore(s => !s)}
            className="ml-auto text-[11px] text-ink-400 hover:text-ink-600 transition-colors">
            {showMore ? 'Fewer options ↑' : 'More options ↓'}
          </button>
        </div>

        {showMore && (
          <div className="space-y-3 border-t border-ink-100 pt-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Status</label>
                <input value={form.status} onChange={set('status')}
                  placeholder="e.g. Alive" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Allegiance</label>
                <input value={form.allegiance} onChange={set('allegiance')}
                  placeholder="e.g. The Guild" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Notes</label>
              <textarea value={form.description} onChange={set('description')} rows={2}
                placeholder="First impressions, observations…"
                className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-800 placeholder-ink-400 bg-white resize-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">
                Appears from chapter
              </label>
              <input value={form.revealChapter} onChange={set('revealChapter')}
                type="number" min="1" placeholder="Leave blank to always show"
                className={inputCls} />
              <p className="text-[10px] text-ink-400 mt-1">
                Set this if you want the character hidden before a certain chapter in strict spoiler mode.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onClose}
          className="text-[12px] text-ink-500 hover:text-ink-700 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
          Cancel
        </button>
        <button onClick={save} disabled={!canSave}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg btn-accent disabled:opacity-40">
          Add to cast
        </button>
      </div>
    </div>
  )
}

// ── Character card ─────────────────────────────────────────────────────────

function CharCard({ ch, raw, veiled, book, visibleChars, onSave, onUpdateBook, onDelete }) {
  const [open,          setOpen]          = useState(false)
  const [editing,       setEditing]       = useState(false)
  const [confirming,    setConfirming]    = useState(false)
  const [editForm,      setEditForm]      = useState({})
  const [addingRel,     setAddingRel]     = useState(false)
  const [relForm,       setRelForm]       = useState({ toId: '', type: 'neutral', label: '' })
  const [editingRelIdx, setEditingRelIdx] = useState(null)
  const [editRelForm,   setEditRelForm]   = useState({ label: '', type: 'neutral' })

  const startEdit = () => {
    setEditForm({
      role:          raw.role          || '',
      status:        raw.status        || '',
      allegiance:    raw.allegiance    || '',
      description:   raw.description   || '',
      revealChapter: raw.revealChapter ?? '',
    })
    setEditing(true)
    setConfirming(false)
    setEditingRelIdx(null)
  }

  const saveEdit = () => {
    const rc = editForm.revealChapter !== '' ? parseInt(editForm.revealChapter) : null
    onSave({
      ...raw,
      role:          editForm.role.trim()        || raw.role,
      status:        editForm.status.trim()      || raw.status,
      allegiance:    editForm.allegiance.trim()  || raw.allegiance,
      description:   editForm.description.trim(),
      revealChapter: rc,
      spoilerSafe:   rc == null && raw.spoilerSafe,
      alive:         deriveAlive(editForm.status),
      updatedAt:     new Date().toISOString().split('T')[0],
    })
    setEditing(false)
  }

  const setE = k => e => setEditForm(f => ({ ...f, [k]: e.target.value }))

  // Only show relationships where both ends are visible (spoiler-safe)
  const visibleIds = new Set(visibleChars.map(c => c.id))
  const rels = (book.characters.relationships || []).filter(
    r => (r.from === ch.id || r.to === ch.id) && visibleIds.has(r.from) && visibleIds.has(r.to)
  )
  const relTargets = visibleChars.filter(c => c.id !== ch.id)

  const removeRel = rel => {
    setEditingRelIdx(null)
    onUpdateBook({
      characters: {
        ...book.characters,
        relationships: book.characters.relationships.filter(r => r !== rel),
      },
    })
  }

  const addRel = () => {
    if (!relForm.toId || !relForm.label.trim()) return
    onUpdateBook({
      characters: {
        ...book.characters,
        relationships: [
          ...(book.characters.relationships || []),
          { from: ch.id, to: relForm.toId, label: relForm.label.trim(), type: relForm.type },
        ],
      },
    })
    setRelForm({ toId: '', type: 'neutral', label: '' })
    setAddingRel(false)
  }

  const startEditRel = (i, rel) => {
    setEditingRelIdx(i)
    setEditRelForm({ label: rel.label || '', type: rel.type || 'neutral' })
    setAddingRel(false)
  }

  const saveEditRel = () => {
    const rel = rels[editingRelIdx]
    if (!rel) return
    onUpdateBook({
      characters: {
        ...book.characters,
        relationships: book.characters.relationships.map(r =>
          r === rel
            ? { ...r, label: editRelForm.label.trim() || r.label, type: editRelForm.type }
            : r
        ),
      },
    })
    setEditingRelIdx(null)
  }

  const aliveCls = ch.alive && !veiled
    ? 'text-sage bg-sage-bg border-sage-pale'
    : 'text-ink-500 bg-ink-100 border-ink-200'

  const isUserAdded = raw?.userAdded
  const wasUpdated  = !isUserAdded && raw?.updatedAt
  const inputCls    = 'w-full border border-ink-200 rounded-lg px-2.5 py-1.5 text-sm text-ink-800 bg-white'

  return (
    <div className={`rounded-xl border overflow-hidden ${veiled ? 'opacity-80' : ''} bg-cream-50 border-ink-200`}>
      <button
        className="w-full text-left p-4 flex items-center gap-3"
        onClick={() => {
          setOpen(o => !o)
          setEditing(false)
          setConfirming(false)
          setEditingRelIdx(null)
        }}>
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${
          veiled ? 'bg-ink-100 border-ink-200 text-ink-400' : 'bg-gold-bg border-gold-border text-gold'
        }`}>
          <Ico.User />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-sm font-semibold text-ink-900">{ch.name}</p>
            <span className={`text-[10px] font-medium px-2 py-[2px] rounded-full border ${aliveCls}`}>
              {ch.status}
            </span>
            {isUserAdded && (
              <span className="text-[9px] text-ink-300 italic">yours</span>
            )}
          </div>
          <p className="text-[12px] text-ink-500 mt-0.5 truncate">
            {ch.role}{ch.lastSeen && ` · Last seen ${ch.lastSeen}`}
          </p>
        </div>
        <span className={`text-ink-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
          <Ico.Down />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-ink-100 animate-fade-in">
          {confirming ? (
            // ── Delete confirmation ──────────────────────────────────
            <div className="animate-fade-in">
              <p className="text-[13px] text-ink-600 mb-4 leading-relaxed">
                Remove this character from the companion?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)}
                  className="text-[12px] text-ink-600 hover:text-ink-800 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
                  Keep them
                </button>
                <button onClick={onDelete}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white bg-ember hover:bg-ember-light transition-colors">
                  Yes, remove them
                </button>
              </div>
            </div>

          ) : editing ? (
            // ── Edit mode ─────────────────────────────────────────────
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Role</label>
                  <input value={editForm.role} onChange={setE('role')} className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Status</label>
                  <input value={editForm.status} onChange={setE('status')} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Allegiance</label>
                <input value={editForm.allegiance} onChange={setE('allegiance')} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">Description</label>
                <textarea value={editForm.description} onChange={setE('description')} rows={3}
                  className="w-full border border-ink-200 rounded-lg px-2.5 py-1.5 text-sm text-ink-800 bg-white resize-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-ink-400 block mb-1">
                  Appears from chapter
                </label>
                <input value={editForm.revealChapter} onChange={setE('revealChapter')}
                  type="number" min="1" placeholder="Blank = always visible" className={inputCls} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { setConfirming(true); setEditing(false) }}
                  className="text-[11px] text-ink-400 hover:text-ember italic transition-colors">
                  Remove from cast
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="text-[12px] text-ink-500 hover:text-ink-700 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveEdit}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg btn-accent">
                    Save
                  </button>
                </div>
              </div>
            </div>

          ) : veiled ? (
            // ── Veiled view ───────────────────────────────────────────
            <div className="space-y-3">
              {ch.allegiance && ch.allegiance !== 'Unknown' && (
                <div>
                  <SectionLabel>Allegiance</SectionLabel>
                  <p className="text-[13px] text-ink-700">{ch.allegiance}</p>
                </div>
              )}
              <p className="text-[13px] text-ink-500 leading-relaxed italic">{ch.description}</p>
              {ch._veilReason === 'not-yet-encountered' && (
                <p className="text-[11px] text-ink-400 mt-1">This relationship is still unfolding.</p>
              )}
              {isUserAdded && (
                <button onClick={startEdit}
                  className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors mt-2 block">
                  Edit
                </button>
              )}
            </div>

          ) : (
            // ── Full view ─────────────────────────────────────────────
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <SectionLabel>Allegiance</SectionLabel>
                  <p className="text-[13px] text-ink-700">{ch.allegiance}</p>
                </div>
                {ch.lastSeen && (
                  <div>
                    <SectionLabel>Last seen</SectionLabel>
                    <p className="text-[13px] text-ink-700">{ch.lastSeen}</p>
                  </div>
                )}
              </div>

              {ch.description && (
                <p className="text-[13px] text-ink-600 leading-relaxed">{ch.description}</p>
              )}

              {wasUpdated && (
                <p className="text-[11px] text-ink-300 italic">
                  Your understanding of this character has been revised.
                </p>
              )}

              {/* Relationships ──────────────────────────────────────── */}
              {rels.length > 0 && (
                <div className="border-t border-ink-100 pt-3 space-y-2">
                  <SectionLabel>Connections</SectionLabel>
                  {rels.map((rel, i) => {
                    const otherId   = rel.from === ch.id ? rel.to : rel.from
                    const otherChar = visibleChars.find(c => c.id === otherId)
                    return editingRelIdx === i ? (
                      // ── Inline relationship edit form ──────────────
                      <div key={i} className="space-y-2 animate-fade-in py-1">
                        <input
                          value={editRelForm.label}
                          onChange={e => setEditRelForm(f => ({ ...f, label: e.target.value }))}
                          placeholder="Describe this connection…"
                          autoFocus
                          className="w-full border border-ink-200 rounded-lg px-2.5 py-1.5 text-sm text-ink-800 placeholder-ink-400 bg-white" />
                        <div className="flex items-center gap-2">
                          <select
                            value={editRelForm.type}
                            onChange={e => setEditRelForm(f => ({ ...f, type: e.target.value }))}
                            className="border border-ink-200 rounded-lg px-2 py-1.5 text-sm text-ink-700 bg-white">
                            {REL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <div className="flex gap-2 ml-auto">
                            <button onClick={() => setEditingRelIdx(null)}
                              className="text-[12px] text-ink-500 px-2.5 py-1 rounded-lg border border-ink-200 transition-colors">
                              Cancel
                            </button>
                            <button
                              onClick={saveEditRel}
                              disabled={!editRelForm.label.trim()}
                              className="text-[12px] font-semibold px-2.5 py-1 rounded-lg btn-accent disabled:opacity-40">
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // ── Relationship row ───────────────────────────
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className="text-ink-600 flex-1 truncate">
                          {otherChar?.name ?? otherId}
                          {rel.label && <span className="text-ink-400"> · {rel.label}</span>}
                        </span>
                        <span className="text-[10px] text-ink-400 px-1.5 py-[1px] rounded-full bg-ink-100 flex-shrink-0">
                          {rel.type}
                        </span>
                        <button
                          onClick={() => startEditRel(i, rel)}
                          className="text-[11px] text-ink-300 hover:text-ink-500 transition-colors flex-shrink-0">
                          edit
                        </button>
                        <button onClick={() => removeRel(rel)}
                          className="text-ink-300 hover:text-ember transition-colors flex-shrink-0 ml-1">
                          <Ico.X />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add relationship form ──────────────────────────────── */}
              {addingRel ? (
                <div className="border-t border-ink-100 pt-3 space-y-2 animate-fade-in">
                  <SectionLabel>Add connection</SectionLabel>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select value={relForm.toId}
                      onChange={e => setRelForm(f => ({ ...f, toId: e.target.value }))}
                      className="border border-ink-200 rounded-lg px-2.5 py-1.5 text-sm text-ink-700 bg-white">
                      <option value="">Select character…</option>
                      {relTargets.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select value={relForm.type}
                      onChange={e => setRelForm(f => ({ ...f, type: e.target.value }))}
                      className="border border-ink-200 rounded-lg px-2 py-1.5 text-sm text-ink-700 bg-white">
                      {REL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <input value={relForm.label}
                    onChange={e => setRelForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="Describe this connection…"
                    className="w-full border border-ink-200 rounded-lg px-2.5 py-1.5 text-sm text-ink-800 placeholder-ink-400 bg-white" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAddingRel(false); setRelForm({ toId: '', type: 'neutral', label: '' }) }}
                      className="text-[12px] text-ink-500 px-2.5 py-1 rounded-lg border border-ink-200">
                      Cancel
                    </button>
                    <button onClick={addRel}
                      disabled={!relForm.toId || !relForm.label.trim()}
                      className="text-[12px] font-semibold px-2.5 py-1 rounded-lg btn-accent disabled:opacity-40">
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                  {relTargets.length > 0 ? (
                    <button onClick={() => { setAddingRel(true); setEditingRelIdx(null) }}
                      className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1">
                      <Ico.Plus /> Add connection
                    </button>
                  ) : <span />}
                  <button onClick={startEdit}
                    className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors">
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────

export default function CharactersTab({ book, onUpdateBook }) {
  const { settings } = useSettings()
  const mode         = getEffectiveMode(book, settings)
  const [adding, setAdding] = useState(false)

  const applyView = chars => chars.map(c => getCharacterView(book, c, mode)).filter(Boolean)
  const mainViews      = applyView(book.characters.main)
  const secondaryViews = applyView(book.characters.secondary)
  const visibleChars   = [...mainViews, ...secondaryViews]
  const anyVeiled      = visibleChars.some(c => c._veiled)
  const hasAny         = visibleChars.length > 0

  const allRaw = [...book.characters.main, ...book.characters.secondary]
  const userAddedCount = allRaw.filter(c => c.userAdded).length

  const saveChar = (charType, updated) =>
    onUpdateBook({
      characters: {
        ...book.characters,
        [charType]: book.characters[charType].map(c => c.id === updated.id ? updated : c),
      },
    })

  const deleteChar = (charType, charId) =>
    onUpdateBook({
      characters: {
        ...book.characters,
        [charType]: book.characters[charType].filter(c => c.id !== charId),
        relationships: (book.characters.relationships || []).filter(
          r => r.from !== charId && r.to !== charId
        ),
      },
    })

  const sharedCardProps = charType => ch => {
    const raw = book.characters[charType].find(c => c.id === ch.id)
    return (
      <CharCard key={ch.id} ch={ch} raw={raw} veiled={ch._veiled}
        book={book}
        visibleChars={visibleChars}
        onSave={updated => saveChar(charType, updated)}
        onUpdateBook={onUpdateBook}
        onDelete={() => deleteChar(charType, raw.id)}
      />
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end mb-5">
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[12px] font-semibold hover:opacity-75 transition-opacity"
          style={{ color: 'var(--ca, #B8860B)' }}>
          <Ico.Plus /> Add a character
        </button>
      </div>

      {adding && (
        <AddCharForm book={book} onUpdateBook={onUpdateBook} onClose={() => setAdding(false)} />
      )}

      {/* Empty state ─────────────────────────────────────────────────── */}
      {!hasAny && !adding && (
        <EmptyState
          icon={<Ico.User />}
          title="The cast hasn't assembled yet."
          body="Begin noting the people who matter in this story. They'll gather here as you read — named, described, connected."
          action={
            <button onClick={() => setAdding(true)}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--ca, #B8860B)' }}>
              Add the first character →
            </button>
          }
        />
      )}

      {/* Character lists ─────────────────────────────────────────────── */}
      {hasAny && (
        <div className="space-y-8">
          {mainViews.length > 0 && (
            <div>
              <SectionHeading>Main Characters</SectionHeading>
              <div className="space-y-2">
                {mainViews.map(sharedCardProps('main'))}
              </div>
            </div>
          )}

          {secondaryViews.length > 0 && (
            <div>
              <SectionHeading>Secondary Characters</SectionHeading>
              <div className="space-y-2">
                {secondaryViews.map(sharedCardProps('secondary'))}
              </div>
            </div>
          )}

          <RelationshipMap book={book} />

          {anyVeiled && mode !== 'full' && (
            <p className="text-[11px] text-ink-400 text-center italic">
              Some details remain intentionally obscured — they belong to chapters still ahead.
            </p>
          )}

          {userAddedCount > 0 && (
            <p className="text-[11px] text-ink-300 text-center italic">
              {userAddedCount === 1
                ? 'One character added by you.'
                : `${userAddedCount} characters added by you.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
