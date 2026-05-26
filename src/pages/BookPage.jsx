import { Component } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import BookDashboard from '../components/dashboard/BookDashboard.jsx'
import { logError } from '../utils/logger.js'

// ── Book-level error boundary ─────────────────────────────────────────────────
// Isolates render failures to the current companion.
// Navigation (TopNav) and the rest of the app remain functional.
// The root ErrorBoundary in App.jsx is a last resort; this catches sooner.
class BookErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    logError('Companion', error, { componentStack: info?.componentStack })
  }
  componentDidUpdate(prevProps) {
    // Reset when navigating to a different book
    if (prevProps.bookId !== this.props.bookId && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto px-5 sm:px-10 pt-16 pb-20">
          <p className="font-serif italic text-[15px] text-ink-500 mb-3 leading-relaxed">
            This companion went quiet unexpectedly.
          </p>
          <p className="text-[12px] text-ink-400 leading-relaxed mb-6">
            Your notes and chapters are safe. Reload the page to continue reading, or return to the library.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-[12px] font-medium text-ink-600 border border-ink-200 rounded-lg px-4 py-2 hover:bg-ink-100 transition-colors"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function BookPage() {
  const { bookId } = useParams()
  const { books } = useBooks()
  const book = books.find(b => b.id === bookId)
  if (!book) return <Navigate to="/library" replace />
  return (
    <BookErrorBoundary bookId={bookId}>
      <BookDashboard bookId={bookId} />
    </BookErrorBoundary>
  )
}
