export default function SectionHeading({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-serif text-[15px] font-semibold text-ink-800">{children}</h3>
      {action}
    </div>
  )
}
