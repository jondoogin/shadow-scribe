export default function SectionHeading({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3
        className="font-serif italic font-normal"
        style={{ fontSize: 12, color: 'var(--color-ink-500)', letterSpacing: '0.01em' }}
      >{children}</h3>
      {action}
    </div>
  )
}
