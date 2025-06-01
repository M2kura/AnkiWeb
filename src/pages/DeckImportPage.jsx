import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { validateApkgFile, loadAnkiDatabase } from '../utils/apkgValidator'
import { parseFullDeck, getCardPreviews } from '../utils/ankiParser'

export default function DeckImportPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const [fileData, setFileData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [parseError, setParseError] = useState(null)
    const [deckData, setDeckData] = useState(null)
    const [cardPreviews, setCardPreviews] = useState([])
    const [selectedDeck, setSelectedDeck] = useState(null)

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

            // Parse the database
            const parsedData = parseFullDeck(dbResult.database)
            if (!parsedData.success) {
                throw new Error(`Parsing failed: ${parsedData.error}`)
            }

            // Generate card previews
            const previews = getCardPreviews(
                parsedData.notes, 
                parsedData.cards, 
                parsedData.noteTypes, 
                10
            )

            // Set the data
            setFileData({ file, validationResult: validationInfo })
            setDeckData(parsedData)
            setCardPreviews(previews)

            // Auto-select the default deck
            if (parsedData.deckInfo.defaultDeck) {
                setSelectedDeck(parsedData.deckInfo.defaultDeck)
            }

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

    const handleConfirmImport = () => {
        console.log('Import confirmed for:', fileData.file.name)
        console.log('Selected deck:', selectedDeck)
        console.log('Deck data:', deckData)
        alert('Import functionality will be implemented in the next step!')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading and parsing deck...</p>
                </div>
            </div>
        )
    }

    if (parseError) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="bg-red-100 border border-red-200 rounded-lg p-6">
                        <h1 className="text-2xl font-bold text-red-900 mb-4">Import Error</h1>
                        <p className="text-red-800 mb-4">{parseError}</p>
                        <button
                            onClick={handleGoBack}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!fileData || !deckData) {
        return null
    }

    const { file, validationResult } = fileData

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">Import Anki Deck</h1>
                        <button
                            onClick={handleGoBack}
                            className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                            ← Back to Home
                        </button>
                    </div>

                    {/* File Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h2 className="text-lg font-semibold text-blue-900 mb-2">File Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Filename:</span>
                                <span className="ml-2 text-gray-900">{file.name}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">File Size:</span>
                                <span className="ml-2 text-gray-900">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Total Cards:</span>
                                <span className="ml-2 text-gray-900">{deckData.statistics.totalCards}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Total Notes:</span>
                                <span className="ml-2 text-gray-900">{deckData.statistics.totalNotes}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Media Files:</span>
                                <span className="ml-2 text-gray-900">{validationResult.mediaFileCount || 0}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Note Types:</span>
                                <span className="ml-2 text-gray-900">{deckData.noteTypes.modelCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deck Information */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Deck Information</h2>

                    {deckData.deckInfo.deckCount > 1 ? (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Deck to Import:
                            </label>
                            <select 
                                value={selectedDeck?.id || ''} 
                                onChange={(e) => {
                                    const deck = Object.values(deckData.deckInfo.decks).find(d => d.id == e.target.value)
                                    setSelectedDeck(deck)
                                }}
                                className="border border-gray-300 rounded-md px-3 py-2 bg-white"
                            >
                                {Object.values(deckData.deckInfo.decks).map(deck => (
                                    <option key={deck.id} value={deck.id}>
                                        {deck.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {selectedDeck && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-green-900 mb-2">{selectedDeck.name}</h3>
                            {selectedDeck.description && (
                                <p className="text-green-800 mb-2">{selectedDeck.description}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">Deck ID:</span>
                                    <span className="ml-2 text-gray-900">{selectedDeck.id}</span>
                                </div>
                                {selectedDeck.created && (
                                    <div>
                                        <span className="font-medium text-gray-700">Created:</span>
                                        <span className="ml-2 text-gray-900">
                                            {selectedDeck.created.toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <span className="font-medium text-gray-700">Config:</span>
                                    <span className="ml-2 text-gray-900">{selectedDeck.config}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Statistics */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cards by Status */}
                        {deckData.statistics.cardsByStatus.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Cards by Status</h4>
                                <div className="space-y-1">
                                    {deckData.statistics.cardsByStatus.map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <span className="text-gray-700">{item.status}:</span>
                                            <span className="font-medium">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Note Types */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">Note Types</h4>
                            <div className="space-y-1">
                                {Object.values(deckData.noteTypes.models).map(model => (
                                    <div key={model.id} className="text-sm">
                                        <div className="font-medium text-gray-800">{model.name}</div>
                                        <div className="text-gray-600 text-xs">
                                            {model.fields.length} fields, {model.cardCount} card types
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card Previews */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Card Previews</h2>

                    {cardPreviews.length > 0 ? (
                        <div className="space-y-4">
                            {cardPreviews.slice(0, 5).map((preview, index) => (
                                <div key={preview.cardId} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-medium text-gray-600">
                                            Card {index + 1} - {preview.noteType}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            preview.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                            preview.status === 'Learning' ? 'bg-yellow-100 text-yellow-800' :
                                            preview.status === 'Review' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {preview.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-1">Front:</h4>
                                            <div 
                                                className="text-sm bg-gray-50 p-2 rounded border min-h-[60px]"
                                                dangerouslySetInnerHTML={{ __html: preview.front }}
                                            />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-1">Back:</h4>
                                            <div 
                                                className="text-sm bg-gray-50 p-2 rounded border min-h-[60px]"
                                                dangerouslySetInnerHTML={{ __html: preview.back }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {cardPreviews.length > 5 && (
                                <div className="text-center text-gray-600 text-sm">
                                    ... and {cardPreviews.length - 5} more cards
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800">No card previews available</p>
                        </div>
                    )}
                </div>

                {/* Import Options */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Import Options</h2>

                    <div className="space-y-4">
                        {/* Import Settings */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">Import Settings</h3>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input type="checkbox" className="rounded" defaultChecked />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Import all cards ({deckData.statistics.totalCards} cards)
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" className="rounded" defaultChecked />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Import media files ({validationResult.mediaFileCount || 0} files)
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" className="rounded" />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Overwrite existing cards with same ID
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={handleConfirmImport}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Import {selectedDeck?.name || 'Deck'}
                            </button>
                            <button
                                onClick={handleGoBack}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
