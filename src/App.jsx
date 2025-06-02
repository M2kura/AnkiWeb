import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import HomePage from './pages/HomePage'
import DeckEditorPage from './pages/DeckEditorPage'
import PracticePage from './pages/PracticePage'
import ConnectionStatus from './components/ConnectionStatus'

export default function App() {
  return (
    <Router basename="/AnkiWeb/">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/deck-editor" element={<DeckEditorPage />} />
        <Route path="/practice/:deckId" element={<PracticePage />} />
      </Routes>
      <ConnectionStatus />
      <footer className="bg-gray-100 text-gray-500 text-center py-4 mt-8">
        <span>&copy; 2024 AnkiWeb. All rights reserved.</span>
      </footer>
    </Router>
  )
}
