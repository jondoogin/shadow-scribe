export default function EmptyState({ icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="relative mb-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-cream-200 to-cream-50 border border-ink-200 flex items-center justify-center text-ink-400 shadow-sm">
          {icon}
        </div>
        <div className="absolute inset-0 rounded-full"
          style={{ background:'radial-gradient(circle at 50% 30%, rgba(184,134,11,.06), transparent 70%)' }} />
      </div>
      <p className="font-serif text-[15px] text-ink-700 font-semibold mb-2 leading-snug">{title}</p>
      <p className="text-[13px] text-ink-400 max-w-[280px] leading-relaxed mb-5">{body}</p>
      {action}
    </div>
  )
}
