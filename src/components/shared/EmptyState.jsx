export default function EmptyState({ icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-11 h-11 rounded-full bg-ink-100 flex items-center justify-center text-ink-400 mb-4">
        {icon}
      </div>
      <p className="font-serif text-ink-700 font-medium mb-1">{title}</p>
      <p className="text-[13px] text-ink-400 max-w-xs leading-relaxed mb-4">{body}</p>
      {action}
    </div>
  )
}
