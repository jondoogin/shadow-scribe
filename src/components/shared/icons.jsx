export const sp = { viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeLinecap:'round', strokeLinejoin:'round' }

export const Ico = {
  Book:    (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4" {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  Plus:    (p) => <svg {...sp} strokeWidth="2"   className="w-3.5 h-3.5" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check:   (p) => <svg {...sp} strokeWidth="2.5" className="w-3 h-3"   {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Search:  (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Left:    (p) => <svg {...sp} strokeWidth="2"   className="w-3.5 h-3.5" {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Star:    (p) => <svg {...sp} strokeWidth="1.8" fill={p.f?'currentColor':'none'} className="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  User:    (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Eye:     (p) => <svg {...sp} strokeWidth="1.8" className="w-3 h-3"   {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Down:    (p) => <svg {...sp} strokeWidth="2"   className="w-4 h-4"   {...p}><polyline points="6 9 12 15 18 9"/></svg>,
  Note:    (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Mystery: (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Chat:    (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Chart:   (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  X:       (p) => <svg {...sp} strokeWidth="2"   className="w-4 h-4"   {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Refresh: (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  Menu:    (p) => <svg {...sp} strokeWidth="2"   className="w-4 h-4"   {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Library: (p) => <svg {...sp} strokeWidth="1.8" className="w-4 h-4"   {...p}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
}
