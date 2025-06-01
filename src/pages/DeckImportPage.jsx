import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function DeckImportPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const [deckData, setDeckData] = useState(null)
    const [deckName, setDeckName] = useState('')
    const [cardsPerPage, setCardsPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [editingCards, setEditingCards] = useState({})
    const [modifiedCards, setModifiedCards] = useState({})

    useEffect(() => {
        loadDeckData()
    }, [location.state, navigate])

    const loadDeckData = () => {
        // Get the deck data passed from HomePage
        const { deckData, deckInfo } = location.state || {}

        if (!deckData || !deckInfo) {
            navigate('/')
            return
        }

        setDeckData(deckData)
        setDeckName(deckData.name)
    }

    const handleGoBack = () => {
        navigate('/')
    }

    const handleImport = () => {
        try {
            // Generate a unique deck ID
            const deckId = `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            // Apply any modifications to the cards
            const finalCards = deckData.cards.map(card => {
                const modifiedCard = modifiedCards[card.id]
                if (modifiedCard) {
                    return {
                        ...card,
                        front: modifiedCard.front,
                        back: modifiedCard.back,
                        modified: true
                    }
                }
                return card
            })
            
            // Prepare deck data for storage
            const deckDataToStore = {
                id: deckId,
                name: deckName,
                description: deckData.description || '',
                cards: finalCards,
                importedAt: new Date().toISOString(),
                totalCards: finalCards.length,
                modifiedCards: Object.keys(modifiedCards).length
            }
            
            // Store deck data in localStorage
            localStorage.setItem(`ankiweb_deck_${deckId}`, JSON.stringify(deckDataToStore))
            
            // Also update the decks list
            const existingDecks = JSON.parse(localStorage.getItem('ankiweb_decks') || '[]')
            const deckSummary = {
                id: deckId,
                name: deckName,
                cardCount: finalCards.length,
                importedAt: deckDataToStore.importedAt
            }
            existingDecks.push(deckSummary)
            localStorage.setItem('ankiweb_decks', JSON.stringify(existingDecks))
            
            console.log('Deck stored successfully:', deckId)
            
            // Navigate to practice page
            navigate(`/practice/${deckId}`)
            
        } catch (error) {
            console.error('Error importing deck:', error)
            alert('Error importing deck. Please try again.')
        }
    }

    if (!deckData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No deck data found</p>
                    <button
                        onClick={handleGoBack}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        )
    }

    // Calculate pagination
    const totalCards = deckData.cards.length
    const totalPages = cardsPerPage === 'all' ? 1 : Math.ceil(totalCards / Number(cardsPerPage))
    const startIndex = cardsPerPage === 'all' ? 0 : (currentPage - 1) * Number(cardsPerPage)
    const endIndex = cardsPerPage === 'all' ? totalCards : startIndex + Number(cardsPerPage)
    const displayedCards = deckData.cards.slice(startIndex, endIndex)

    const handleCardsPerPageChange = (value) => {
        setCardsPerPage(value)
        setCurrentPage(1)
    }

    const handlePageChange = (page) => {
        setCurrentPage(page)
        document.querySelector('.cards-section')?.scrollIntoView({ behavior: 'smooth' })
    }

    const startEditing = (cardId) => {
        const card = deckData.cards.find(c => c.id === cardId)
        setEditingCards(prev => ({
            ...prev,
            [cardId]: {
                front: card.front,
                back: card.back
            }
        }))
    }

    const cancelEditing = (cardId) => {
        setEditingCards(prev => {
            const updated = { ...prev }
            delete updated[cardId]
            return updated
        })
    }

    const saveCardChanges = (cardId) => {
        const editData = editingCards[cardId]
        if (!editData) return

        setModifiedCards(prev => ({
            ...prev,
            [cardId]: {
                front: editData.front.trim(),
                back: editData.back.trim()
            }
        }))

        cancelEditing(cardId)
    }

    const updateCardField = (cardId, field, value) => {
        setEditingCards(prev => ({
            ...prev,
            [cardId]: {
                ...prev[cardId],
                [field]: value
            }
        }))
    }

    // Get the final version of a card (modified or original)
    const getFinalCard = (card) => {
        const modified = modifiedCards[card.id]
        if (modified) {
            return { ...card, ...modified }
        }
        return card
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="text"
                                    value={deckName}
                                    onChange={(e) => setDeckName(e.target.value)}
                                    className="text-3xl font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1"
                                    placeholder="Deck name..."
                                />
                                <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">
                                    ✓ JSON Format
                                </span>
                            </div>
                            <p className="text-gray-600">
                                {totalCards} cards ready for import
                                {deckData.description && (
                                    <span className="block text-sm mt-1">{deckData.description}</span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleGoBack}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleImport}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                            >
                                Import Deck
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cards List */}
                <div className="bg-white rounded-lg shadow-sm cards-section">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">All Cards</h2>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Show:</span>
                                <select 
                                    value={cardsPerPage}
                                    onChange={(e) => handleCardsPerPageChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                >
                                    <option value={10}>10 per page</option>
                                    <option value={25}>25 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value="all">All cards</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                {cardsPerPage === 'all' ? (
                                    `Showing all ${totalCards} cards`
                                ) : (
                                    `Showing ${startIndex + 1}-${Math.min(endIndex, totalCards)} of ${totalCards} cards`
                                )}
                            </div>
                            {Object.keys(modifiedCards).length > 0 && (
                                <div className="text-sm text-green-600 font-medium">
                                    {Object.keys(modifiedCards).length} cards modified
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {displayedCards.map((card, index) => {
                            const isEditing = !!editingCards[card.id]
                            const editData = editingCards[card.id]
                            const isModified = !!modifiedCards[card.id]
                            const finalCard = getFinalCard(card)

                            return (
                                <div key={card.id} className={`p-6 ${isModified ? 'bg-green-50' : ''}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">
                                                Card {startIndex + index + 1}
                                            </span>
                                            {isModified && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                    Modified
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isEditing ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => saveCardChanges(card.id)}
                                                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => cancelEditing(card.id)}
                                                        className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(card.id)}
                                                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Front
                                            </label>
                                            {isEditing ? (
                                                <textarea
                                                    value={editData.front}
                                                    onChange={(e) => updateCardField(card.id, 'front', e.target.value)}
                                                    className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-y"
                                                    placeholder="Front side content..."
                                                />
                                            ) : (
                                                <div 
                                                    className="min-h-[80px] p-3 bg-gray-50 border rounded-lg text-sm cursor-pointer hover:bg-gray-100 whitespace-pre-wrap"
                                                    onClick={() => startEditing(card.id)}
                                                >
                                                    {finalCard.front}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Back
                                            </label>
                                            {isEditing ? (
                                                <textarea
                                                    value={editData.back}
                                                    onChange={(e) => updateCardField(card.id, 'back', e.target.value)}
                                                    className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-y"
                                                    placeholder="Back side content..."
                                                />
                                            ) : (
                                                <div 
                                                    className="min-h-[80px] p-3 bg-gray-50 border rounded-lg text-sm cursor-pointer hover:bg-gray-100 whitespace-pre-wrap"
                                                    onClick={() => startEditing(card.id)}
                                                >
                                                    {finalCard.back}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {cardsPerPage !== 'all' && totalPages > 1 && (
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded text-sm ${
                                        currentPage === 1 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                    ← Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage > totalPages - 3) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-8 h-8 rounded text-sm ${
                                                    pageNum === currentPage
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded text-sm ${
                                        currentPage === totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 text-center">
                    <button
                        onClick={handleImport}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg"
                    >
                        Import All {totalCards} Cards
                        {Object.keys(modifiedCards).length > 0 && 
                            ` (${Object.keys(modifiedCards).length} modified)`
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}
