import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="anki.svg" alt="Anki Logo" className="w-8 h-8" />
          <span className="text-2xl font-bold">AnkiWeb</span>
        </div>
      </div>
    </header>
  )
}
