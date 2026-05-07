export default function ProgressBar({ value, color = 'gold', height = 'h-2', className = '', accentVar = false }) {
  const bg = { gold:'bg-gold', sage:'bg-sage', ember:'bg-ember' }[color] ?? 'bg-gold'
  return (
    <div className={`w-full bg-ink-200 rounded-full overflow-hidden ${height} ${className}`}>
      <div
        className={`h-full ${accentVar ? '' : bg} rounded-full transition-[width] duration-700 ease-out`}
        style={{ width:`${value}%`, ...(accentVar ? { background:'var(--ca, #B8860B)' } : {}) }}
      />
    </div>
  )
}
