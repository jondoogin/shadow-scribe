import { useNavigate } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import CreateCompanion from '../components/library/CreateCompanion.jsx'

export default function NewCompanionPage() {
  const navigate = useNavigate()
  const { createBook } = useBooks()

  const handleCreate = newBook => {
    createBook(newBook)
    navigate(`/book/${newBook.id}`)
  }

  return (
    <CreateCompanion
      onCreate={handleCreate}
      onCancel={() => navigate('/library')}
    />
  )
}
