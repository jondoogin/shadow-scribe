import { useParams, Navigate } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import BookDashboard from '../components/dashboard/BookDashboard.jsx'

export default function BookPage() {
  const { bookId } = useParams()
  const { books } = useBooks()
  const book = books.find(b => b.id === bookId)
  if (!book) return <Navigate to="/library" replace />
  return <BookDashboard bookId={bookId} />
}
