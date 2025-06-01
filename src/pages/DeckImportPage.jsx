import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { validateApkgFile, loadAnkiDatabase } from '../utils/apkgValidator'
import { parseFullDeck, getCardPreviews } from '../utils/ankiParser'

export default function DeckImportPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [parseError, setParseError] = useState(null)
    const [mediaDetails, setMediaDetails] = useState(null)
    const [deckData, setDeckData] = useState(null)
    const [allCards, setAllCards] = useState([])
    const [deckName, setDeckName] = useState('')
    const [cardsPerPage, setCardsPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [editingCards, setEditingCards] = useState({})
    const [modifiedCards, setModifiedCards] = useState({})

    useEffect(() => {
        loadAndParseDeck()
    }, [location.state, navigate])

    const loadAndParseDeck = async () => {
        // Get the file data passed from HomePage
        const { fileData, validationInfo } = location.state || {}

        if (!fileData || !validationInfo) {
            navigate('/')
            return
        }

        try {
            setLoading(true)
            setParseError(null)
            setMediaDetails(null)

            // Convert base64 back to File object
            const base64Data = fileData.base64
            const base64String = base64Data.split(',')[1]
            const byteCharacters = atob(base64String)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const file = new File([byteArray], fileData.name, { 
                type: fileData.type,
                lastModified: fileData.lastModified 
            })

            // Validate and extract database
            const validation = await validateApkgFile(file)
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.error}`)
            }

            // Load database
            const dbResult = await loadAnkiDatabase(validation.databaseBuffer)
            if (!dbResult.success) {
                throw new Error(`Database loading failed: ${dbResult.error}`)
            }

            // Parse the database (now includes media validation)
            const parsedData = parseFullDeck(dbResult.database)
            if (!parsedData.success) {
                // Handle media validation errors specifically
                if (parsedData.mediaDetails) {
                    setMediaDetails(parsedData.mediaDetails)
                }
                throw new Error(parsedData.error)
            }

            // Generate ALL card previews (not just 10)
            const allCardPreviews = getCardPreviews(
                parsedData.notes, 
                parsedData.cards, 
                parsedData.noteTypes, 
                parsedData.statistics.totalCards
            )

            // Set the data
            setDeckData(parsedData)
            setAllCards(allCardPreviews)

            // Get deck name (use default deck name or filename)
            const defaultDeck = parsedData.deckInfo.defaultDeck
            const name = defaultDeck?.name || file.name.replace('.apkg', '')
            setDeckName(name)

            // Clean up database connection
            dbResult.database.close()

        } catch (error) {
            console.error('Error loading and parsing deck:', error)
            setParseError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoBack = () => {
        navigate('/')
    }

    const handleImport = () => {
        console.log('Importing deck:', deckName)
        console.log('Cards to import:', allCards.length)
        // TODO: Implement actual import logic
        alert(`Import functionality will be implemented next!\nDeck: ${deckName}\nCards: ${allCards.length}`)
    }

    // Calculate pagination
    const totalPages = cardsPerPage === 'all' ? 1 : Math.ceil(allCards.length / Number(cardsPerPage))
    const startIndex = cardsPerPage === 'all' ? 0 : (currentPage - 1) * Number(cardsPerPage)
    const endIndex = cardsPerPage === 'all' ? allCards.length : startIndex + Number(cardsPerPage)
    const displayedCards = allCards.slice(startIndex, endIndex)

    const handleCardsPerPageChange = (value) => {
        setCardsPerPage(value)
        setCurrentPage(1)
    }

    const handlePageChange = (page) => {
        setCurrentPage(page)
        document.querySelector('.cards-section')?.scrollIntoView({ behavior: 'smooth' })
    }

    // Helper function to convert HTML to clean text for editing
    const htmlToEditableText = (html) => {
        if (!html) return ''

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html

        let text = html

        text = text.replace(/<br\s*\/?>/gi, '\n')
        text = text.replace(/<\/p>/gi, '\n')
        text = text.replace(/<p[^>]*>/gi, '')
        text = text.replace(/<\/div>/gi, '\n')
        text = text.replace(/<div[^>]*>/gi, '')
        text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        text = text.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, '[Image: $1]')
        text = text.replace(/\[sound:([^\]]+)\]/gi, '[Audio: $1]')
        text = text.replace(/<[^>]*>/g, '')
        text = text.replace(/\n\s*\n/g, '\n')
        text = text.replace(/^\s+|\s+$/g, '')

        tempDiv.innerHTML = text
        text = tempDiv.textContent || tempDiv.innerText || text

        return text
    }

    const editableTextToHtml = (text) => {
        if (!text) return ''

        let html = text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
        html = html.replace(/\n/g, '<br>')
        html = html.replace(/\[Image: ([^\]]+)\]/gi, '<img src="$1">')
        html = html.replace(/\[Audio: ([^\]]+)\]/gi, '[sound:$1]')

        return html
    }

    const startEditing = (cardId) => {
        const card = allCards.find(c => c.cardId === cardId)
        setEditingCards(prev => ({
            ...prev,
            [cardId]: {
                front: htmlToEditableText(card.front),
                back: htmlToEditableText(card.back)
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

        const frontHtml = editableTextToHtml(editData.front)
        const backHtml = editableTextToHtml(editData.back)

        setAllCards(prev => prev.map(card => 
            card.cardId === cardId 
                ? { ...card, front: frontHtml, back: backHtml }
                : card
        ))

        setModifiedCards(prev => ({
            ...prev,
            [cardId]: true
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading and validating deck content...</p>
                </div>
            </div>
        )
    }

    if (parseError) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="bg-red-100 border border-red-200 rounded-lg p-6">
                        <h1 className="text-2xl font-bold text-red-900 mb-4">
                            🚫 Import Rejected - Media Content Detected
                        </h1>
                        <p className="text-red-800 mb-6 text-lg">{parseError}</p>

                        {/* Show detailed media information if available */}
                        {mediaDetails && mediaDetails.length > 0 && (
                            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-red-900 mb-3">Media Found In:</h3>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {mediaDetails.map((issue, index) => (
                                        <div key={index} className="border-l-4 border-red-400 pl-3">
                                            <p className="font-medium text-red-800">{issue.location}</p>
                                            <div className="mt-1 space-y-1">
                                                {issue.media.map((media, mediaIndex) => (
                                                    <div key={mediaIndex} className="text-sm text-red-700 bg-red-100 rounded px-2 py-1">
                                                        <span className="font-medium">{media.type}:</span> {media.reference}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-yellow-800 mb-2">💡 How to Fix This</h3>
                            <ul className="text-yellow-700 space-y-1 text-sm">
                                <li>• Remove all images from your cards</li>
                                <li>• Delete any audio files (including [sound:...] references)</li>
                                <li>• Remove embedded videos or multimedia content</li>
                                <li>• Export a new .apkg file containing only text content</li>
                            </ul>
                        </div>

                        <button
                            onClick={handleGoBack}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg"
                        >
                            ← Try Another Deck
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Header with success indicator */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-3xl font-bold text-gray-900">{deckName}</h1>
                                <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full font-medium">
                                    ✓ Text-Only
                                </span>
                            </div>
                            <p className="text-gray-600">{allCards.length} text-only cards ready for import</p>
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
                                    `Showing all ${allCards.length} cards`
                                ) : (
                                    `Showing ${startIndex + 1}-${Math.min(endIndex, allCards.length)} of ${allCards.length} cards`
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
                            const isEditing = !!editingCards[card.cardId]
                            const editData = editingCards[card.cardId]
                            const isModified = modifiedCards[card.cardId]

                            return (
                                <div key={card.cardId} className={`p-6 ${isModified ? 'bg-green-50' : ''}`}>
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
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                card.status === 'New' ? 'bg-blue-100 text-blue-700' :
                                                card.status === 'Learning' ? 'bg-yellow-100 text-yellow-700' :
                                                card.status === 'Review' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {card.status}
                                            </span>

                                            {isEditing ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => saveCardChanges(card.cardId)}
                                                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => cancelEditing(card.cardId)}
                                                        className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(card.cardId)}
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
                                                <div>
                                                    <textarea
                                                        value={editData.front}
                                                        onChange={(e) => updateCardField(card.cardId, 'front', e.target.value)}
                                                        className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-y"
                                                        placeholder="Front side content..."
                                                    />
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Tip: Use **bold** and *italic* for formatting
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    className="min-h-[80px] p-3 bg-gray-50 border rounded-lg text-sm cursor-pointer hover:bg-gray-100"
                                                    dangerouslySetInnerHTML={{ __html: card.front }}
                                                    onClick={() => startEditing(card.cardId)}
                                                />
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Back
                                            </label>
                                            {isEditing ? (
                                                <div>
                                                    <textarea
                                                        value={editData.back}
                                                        onChange={(e) => updateCardField(card.cardId, 'back', e.target.value)}
                                                        className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-y"
                                                        placeholder="Back side content..."
                                                    />
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Tip: Use **bold** and *italic* for formatting
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    className="min-h-[80px] p-3 bg-gray-50 border rounded-lg text-sm cursor-pointer hover:bg-gray-100"
                                                    dangerouslySetInnerHTML={{ __html: card.back }}
                                                    onClick={() => startEditing(card.cardId)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {card.tags && card.tags.length > 0 && (
                                        <div className="mt-3">
                                            <span className="text-xs text-gray-500">Tags: </span>
                                            {card.tags.map((tag, tagIndex) => (
                                                <span 
                                                    key={tagIndex}
                                                    className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded mr-1"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
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
                        Import All {allCards.length} Cards
                        {Object.keys(modifiedCards).length > 0 && 
                            ` (${Object.keys(modifiedCards).length} modified)`
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}
