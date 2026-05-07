import { useState } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import EmptyState from '../components/shared/EmptyState.jsx'

export default function MysteriesTab({ book, onUpdateBook }) {
  const [showing, setShowing] = useState('active')

  const toggle = id => onUpdateBook({
    mysteries: book.mysteries.map(m =>
      m.id === id ? { ...m, resolved:!m.resolved, status:m.resolved?'open':'resolved' } : m
    ),
  })

  const statusCls = {
    open:     'bg-ember-bg border-ember-pale text-ember',
    hinted:   'bg-gold-bg border-gold-border text-gold',
    resolved: 'bg-sage-bg border-sage-pale text-sage',
  }

  const active   = book.mysteries.filter(m => !m.resolved)
  const resolved = book.mysteries.filter(m =>  m.resolved)
  const visible  = showing === 'active' ? active : showing === 'resolved' ? resolved : book.mysteries

  return (
    <div className="max-w-2xl">
      <div className="flex gap-1.5 mb-5">
        {[
          ['active',   `Open (${active.length})`],
          ['resolved', `Resolved (${resolved.length})`],
          ['all',      'All'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setShowing(k)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
              showing === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-400'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Ico.Mystery />}
          title={showing === 'resolved' ? 'Nothing answered yet' : 'No open threads'}
          body="Every story withholds something. Track the questions the novel is carrying."
        />
      ) : (
        <div className="space-y-2">
          {visible.map(m => (
            <div key={m.id}
              className={`rounded-xl border p-4 transition-all ${m.resolved ? 'mystery-resolved bg-ink-100 border-ink-200' : 'bg-cream-50 border-ink-200'}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggle(m.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    m.resolved ? 'bg-sage border-sage' : 'border-ink-300 hover:border-gold'
                  }`}>
                  {m.resolved && <span className="text-white"><Ico.Check /></span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium leading-relaxed ${m.resolved ? 'line-through text-ink-400' : 'text-ink-800'}`}>
                    {m.text}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-ink-400">First appears ch. {m.chapter}</span>
                    <span className={`text-[10px] font-medium px-2 py-[2px] rounded-full border ${statusCls[m.status] ?? statusCls.open}`}>
                      {m.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
