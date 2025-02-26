export default function Header() {
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/anki.svg" alt="Anki Logo" className="w-8 h-8" />
          <span className="text-2xl font-bold">AnkiWeb</span>
        </div>

        <nav>
          <ul className="flex gap-6">
            <li><a href="#" className="hover:underline">Home</a></li>
            <li><a href="#" className="hover:underline">Decks</a></li>
            <li><a href="#" className="hover:underline">Profile</a></li>
          </ul>
        </nav>

        <div>
          <button className="bg-white text-blue-600 px-4 py-1 rounded-md font-medium hover:bg-blue-100 transition-colors">
            Login
          </button>
        </div>
      </div>
    </header>
  )
}
