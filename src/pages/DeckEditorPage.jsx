import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DeckStats } from '../utils/DeckStats'

export default function DeckEditorPage() {
    const location = useLocation()
    const navigate = useNavigate()
    
    // Mode detection
    const [mode, setMode] = useState('create') // 'create' or 'import'
    const [deckData, setDeckData] = useState(null)
    const [deckName, setDeckName] = useState('')
    const [deckDescription, setDeckDescription] = useState('')
    
    // Pagination and editing states
    const [cardsPerPage, setCardsPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [editingCards, setEditingCards] = useState({})
    const [modifiedCards, setModifiedCards] = useState({})

    useEffect(() => {
        initializePage()
    }, [location.state, navigate])

    const initializePage = () => {
        // Check if we have import data from location state
        const { deckData: importedDeck, deckInfo } = location.state || {}

        if (importedDeck && deckInfo) {
            // Import mode - we have existing deck data
            setMode('import')
            setDeckData(importedDeck)
            setDeckName(importedDeck.name)
            setDeckDescription(importedDeck.description || '')
        } else {
            // Create mode - start with empty deck
            setMode('create')
            const emptyDeck = {
                name: '',
                description: '',
                cards: []
            }
            setDeckData(emptyDeck)
            setDeckName('New Deck')
            setDeckDescription('')
        }
    }

    const handleGoBack = () => {
        navigate('/')
    }

    const handleExportDeck = () => {
        try {
            // Prepare deck data for export
            const exportData = {
                name: deckName.trim(),
                description: deckDescription.trim(),
                cards: deckData.cards.map(card => {
                    const modifiedCard = modifiedCards[card.id]
                    if (modifiedCard) {
                        return {
                            front: modifiedCard.front.trim(),
                            back: modifiedCard.back.trim()
                        }
                    }
                    return {
                        front: card.front.trim(),
                        back: card.back.trim()
                    }
                }).filter(card => card.front && card.back) // Only include non-empty cards
            }

            // Create and download the JSON file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${deckName.trim().toLowerCase().replace(/\s+/g, '-')}-deck.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error exporting deck:', error)
            alert('Error exporting deck. Please try again.')
        }
    }

    // Card management functions
    const addNewCard = () => {
        const newCard = {
            id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            front: '',
            back: ''
        }
        
        setDeckData(prev => ({
            ...prev,
            cards: [...prev.cards, newCard]
        }))
        
        // Automatically start editing the new card
        setEditingCards(prev => ({
            ...prev,
            [newCard.id]: {
                front: '',
                back: ''
            }
        }))
        
        // Navigate to the last page if using pagination
        if (cardsPerPage !== 'all') {
            const newTotalCards = deckData.cards.length + 1
            const newTotalPages = Math.ceil(newTotalCards / Number(cardsPerPage))
            setCurrentPage(newTotalPages)
        }
    }

    const deleteCard = (cardId) => {
        const card = deckData.cards.find(c => c.id === cardId)
        if (!card) return

        // Create a meaningful preview for confirmation
        const frontPreview = card.front.trim() || '[Empty front]'
        const backPreview = card.back.trim() || '[Empty back]'
        const cardNumber = deckData.cards.findIndex(c => c.id === cardId) + 1
        
        const confirmMessage = 
            `Delete Card ${cardNumber}?\n\n` +
            `Front: "${frontPreview.substring(0, 60)}${frontPreview.length > 60 ? '...' : ''}"\n` +
            `Back: "${backPreview.substring(0, 60)}${backPreview.length > 60 ? '...' : ''}"\n\n` +
            `This action cannot be undone.`
        
        if (!confirm(confirmMessage)) return

        // Remove card from deck data
        setDeckData(prev => ({
            ...prev,
            cards: prev.cards.filter(c => c.id !== cardId)
        }))

        // Clean up related state
        setEditingCards(prev => {
            const updated = { ...prev }
            delete updated[cardId]
            return updated
        })

        setModifiedCards(prev => {
            const updated = { ...prev }
            delete updated[cardId]
            return updated
        })

        // Handle pagination after deletion
        const newTotalCards = deckData.cards.length - 1
        if (cardsPerPage !== 'all' && newTotalCards > 0) {
            const newTotalPages = Math.ceil(newTotalCards / Number(cardsPerPage))
            if (currentPage > newTotalPages) {
                setCurrentPage(newTotalPages)
            }
        }
    }

    const deleteAllCards = () => {
        if (deckData.cards.length === 0) return

        const confirmMessage = 
            `⚠️ DELETE ALL CARDS?\n\n` +
            `This will permanently delete all ${deckData.cards.length} cards from "${deckName}".\n\n` +
            `This action cannot be undone.\n\n` +
            `Type "DELETE" to confirm:`
        
        const userInput = prompt(confirmMessage)
        if (userInput !== 'DELETE') return

        // Clear all card-related state
        setDeckData(prev => ({ ...prev, cards: [] }))
        setEditingCards({})
        setModifiedCards({})
        setCurrentPage(1)
    }

    const handleSaveDeck = () => {
        try {
            // Validate deck before saving
            if (!deckName.trim()) {
                alert('Please enter a deck name')
                return
            }

            if (deckData.cards.length === 0) {
                alert('Please add at least one card to the deck')
                return
            }

            // Check for empty cards
            const emptyCards = deckData.cards.filter(card => 
                !card.front.trim() || !card.back.trim()
            )
            
            if (emptyCards.length > 0) {
                const proceed = confirm(
                    `${emptyCards.length} card(s) have empty front or back sides. ` +
                    'These cards will be excluded from the deck. Continue?'
                )
                if (!proceed) return
            }

            // Generate a unique deck ID
            const deckId = `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            // Apply any modifications to the cards and filter out empty ones
            const finalCards = deckData.cards
                .map(card => {
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
                .filter(card => card.front.trim() && card.back.trim()) // Remove empty cards
            
            // Prepare deck data for storage
            const deckDataToStore = {
                id: deckId,
                name: deckName.trim(),
                description: deckDescription.trim(),
                cards: finalCards,
                createdAt: new Date().toISOString(),
                totalCards: finalCards.length,
                modifiedCards: Object.keys(modifiedCards).length,
                mode: mode // Track how this deck was created
            }
            
            // Store deck data in localStorage
            localStorage.setItem(`ankiweb_deck_${deckId}`, JSON.stringify(deckDataToStore))
            
            // Also update the decks list
            const existingDecks = JSON.parse(localStorage.getItem('ankiweb_decks') || '[]')
            const deckSummary = {
                id: deckId,
                name: deckName.trim(),
                cardCount: finalCards.length,
                createdAt: deckDataToStore.createdAt
            }
            existingDecks.push(deckSummary)
            localStorage.setItem('ankiweb_decks', JSON.stringify(existingDecks))
            
            console.log('Deck saved successfully:', deckId)
            
            // Navigate to practice page
            navigate(`/practice/${deckId}`)
            
        } catch (error) {
            console.error('Error saving deck:', error)
            alert('Error saving deck. Please try again.')
        }
    }

    // Early return if no deck data (shouldn't happen, but safety check)
    if (!deckData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Loading deck editor...</p>
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

        // For new cards, update the main deck data directly
        if (deckData.cards.find(c => c.id === cardId && !c.front && !c.back)) {
            setDeckData(prev => ({
                ...prev,
                cards: prev.cards.map(card => 
                    card.id === cardId 
                        ? { ...card, front: editData.front.trim(), back: editData.back.trim() }
                        : card
                )
            }))
        } else {
            // For existing cards, use the modified cards system
            setModifiedCards(prev => ({
                ...prev,
                [cardId]: {
                    front: editData.front.trim(),
                    back: editData.back.trim()
                }
            }))
        }

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

    // Get deck stats using OOP class
    const deckStats = new DeckStats(deckData)

    // Get page title and action button text based on mode
    const pageTitle = mode === 'import' ? 'Import Deck' : 'Create New Deck'
    const actionButtonText = mode === 'import' 
        ? `Import All ${totalCards} Cards` 
        : totalCards > 0 
            ? `Save Deck (${totalCards} cards)` 
            : 'Save Deck'

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="text"
                                    value={deckName}
                                    onChange={(e) => setDeckName(e.target.value)}
                                    className="text-3xl font-bold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1"
                                    placeholder="Enter deck name..."
                                />
                                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                                    mode === 'import' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-green-100 text-green-700'
                                }`}>
                                    {mode === 'import' ? '✓ JSON Import' : '✨ New Deck'}
                                </span>
                            </div>
                            
                            {/* Deck description */}
                            <textarea
                                value={deckDescription}
                                onChange={(e) => setDeckDescription(e.target.value)}
                                className="w-full text-gray-600 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 resize-none"
                                placeholder="Add a deck description (optional)..."
                                rows="2"
                            />
                            
                            <p className="text-gray-500 text-sm mt-1">
                                {totalCards} cards total
                                {Object.keys(modifiedCards).length > 0 && (
                                    <span className="text-green-600 ml-2">
                                        ({Object.keys(modifiedCards).length} modified)
                                    </span>
                                )}
                                <span className="ml-4">Avg. card length: {deckStats.averageCardLength()} chars</span>
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
                                onClick={handleExportDeck}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                                title="Export deck as JSON file"
                            >
                                Export JSON
                            </button>
                            <button
                                onClick={handleSaveDeck}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                            >
                                {actionButtonText}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Empty state for create mode or when all cards deleted */}
                {totalCards === 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center mb-6">
                        <div className="text-gray-400 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {mode === 'create' ? 'Your deck is empty' : 'No cards remaining'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {mode === 'create' 
                                ? 'Start by adding your first flashcard' 
                                : 'All cards have been deleted. Add some cards to continue.'
                            }
                        </p>
                        <button 
                            onClick={addNewCard}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
                        >
                            {mode === 'create' ? 'Add First Card' : 'Add New Card'}
                        </button>
                    </div>
                )}

                {/* Cards List - only show if we have cards */}
                {totalCards > 0 && (
                    <div className="bg-white rounded-lg shadow-sm cards-section">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">All Cards</h2>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={addNewCard}
                                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded text-sm"
                                    >
                                        + Add Card
                                    </button>

                                    {totalCards > 0 && (
                                        <button
                                            onClick={deleteAllCards}
                                            className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded text-sm"
                                        >
                                            Delete All
                                        </button>
                                    )}
                                    
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
                                const isEmpty = !finalCard.front.trim() && !finalCard.back.trim()

                                return (
                                    <div key={card.id} className={`p-6 ${isModified ? 'bg-green-50' : isEmpty ? 'bg-yellow-50' : ''}`}>
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
                                                {isEmpty && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                                        Empty - needs content
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
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => startEditing(card.id)}
                                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deleteCard(card.id)}
                                                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                                            title="Delete this card"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
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
                                                        autoFocus={isEmpty}
                                                    />
                                                ) : (
                                                    <div 
                                                        className={`min-h-[80px] p-3 border rounded-lg text-sm cursor-pointer hover:bg-gray-100 whitespace-pre-wrap ${
                                                            finalCard.front.trim() ? 'bg-gray-50' : 'bg-gray-100 text-gray-400 italic'
                                                        }`}
                                                        onClick={() => startEditing(card.id)}
                                                    >
                                                        {finalCard.front.trim() || 'Click to add front side content...'}
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
                                                        className={`min-h-[80px] p-3 border rounded-lg text-sm cursor-pointer hover:bg-gray-100 whitespace-pre-wrap ${
                                                            finalCard.back.trim() ? 'bg-gray-50' : 'bg-gray-100 text-gray-400 italic'
                                                        }`}
                                                        onClick={() => startEditing(card.id)}
                                                    >
                                                        {finalCard.back.trim() || 'Click to add back side content...'}
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
                )}

                {/* Bottom Actions */}
                {totalCards > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={addNewCard}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg"
                        >
                            + Add Another Card
                        </button>
                        
                        <button
                            onClick={handleSaveDeck}
                            disabled={!deckName.trim()}
                            className={`font-semibold py-3 px-8 rounded-lg text-lg ${
                                !deckName.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {actionButtonText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
