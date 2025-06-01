import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import HomePage from './pages/HomePage'
import DeckImportPage from './pages/DeckImportPage'

export default function App() {
  return (
    <Router basename="/AnkiWeb/">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/import" element={<DeckImportPage />} />
      </Routes>
    </Router>
  )
}
