import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validateJsonDeck, getJsonDeckInfo } from '../utils/jsonDeckValidator'

export default function HomePage() {
    const navigate = useNavigate()
    const fileInputRef = useRef(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadStatus, setUploadStatus] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [validationResult, setValidationResult] = useState(null)
    const [isNavigating, setIsNavigating] = useState(false)

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleContinueImport = async () => {
        if (selectedFile && validationResult) {
            try {
                setIsNavigating(true)

                // Convert file to base64 for passing through navigation
                const fileReader = new FileReader()
                fileReader.onload = () => {
                    const base64Data = fileReader.result

                    // Navigate to import page with deck data
                    navigate('/deck-editor', {
                        state: {
                            fileData: {
                                name: selectedFile.name,
                                size: selectedFile.size,
                                type: selectedFile.type,
                                lastModified: selectedFile.lastModified,
                                base64: base64Data
                            },
                            deckData: validationResult.deckData,
                            deckInfo: validationResult.deckInfo
                        }
                    })
                }
                fileReader.readAsDataURL(selectedFile)
            } catch (error) {
                console.error('Error preparing file for navigation:', error)
                setUploadStatus('Error preparing file. Please try again.')
                setIsNavigating(false)
            }
        }
    }

    const handleFileSelect = async (event) => {
        const file = event.target.files[0]

        if (!file) {
            setSelectedFile(null)
            setUploadStatus('')
            setValidationResult(null)
            return
        }

        // Basic validation: check file extension
        if (!file.name.toLowerCase().endsWith('.json')) {
            setUploadStatus('Please select a valid .json file')
            setSelectedFile(null)
            setValidationResult(null)
            return
        }

        // Show loading state
        setIsValidating(true)
        setUploadStatus('Validating deck format...')
        setSelectedFile(null)
        setValidationResult(null)

        try {
            // Validate the JSON deck file
            const validation = await validateJsonDeck(file)

            if (validation.isValid) {
                // Get additional deck info
                const deckInfo = getJsonDeckInfo(validation.deckData)

                setSelectedFile(file)
                setValidationResult({ 
                    deckData: validation.deckData,
                    deckInfo: deckInfo
                })
                setUploadStatus(
                    `✓ Valid flashcard deck: "${deckInfo.deckName}" ` +
                    `(${deckInfo.totalCards} cards, ` +
                    `${(file.size / 1024).toFixed(1)} KB)`
                )
            } else {
                setUploadStatus(validation.error)
                setSelectedFile(null)
                setValidationResult(null)
            }
        } catch (error) {
            console.error('Validation error:', error)
            setUploadStatus('Error validating file. Please try again.')
            setSelectedFile(null)
            setValidationResult(null)
        } finally {
            setIsValidating(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-12 max-w-6xl mx-auto">
                    {/* Left side - Large Image */}
                    <div className="flex-1 w-full lg:w-1/2">
                        <img 
                            src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
                            alt="Study with flashcards" 
                            className="w-full h-96 lg:h-[500px] object-cover rounded-lg shadow-xl"
                        />
                    </div>

                    {/* Right side - Content Column */}
                    <div className="flex-1 w-full lg:w-1/2 text-center lg:text-left">
                        {/* Title */}
                        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                            Master Any Subject with 
                            <span className="text-blue-600 block">Smart Flashcards</span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                            Create and study with custom flashcards using spaced repetition. 
                            Import your own JSON deck files or create new ones to start learning efficiently.
                        </p>

                        {/* Format info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h3 className="text-sm font-semibold text-blue-800 mb-2">📄 JSON Deck Format</h3>
                            <p className="text-sm text-blue-700">
                                Use simple JSON files with front/back flashcards. Easy to create and edit in any text editor.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button 
                                onClick={() => navigate('/deck-editor')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Create new deck
                            </button>

                            <button 
                                onClick={handleImportClick}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Import JSON deck
                            </button>
                        </div>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Status message */}
                        {uploadStatus && (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                                isValidating 
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : selectedFile 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                                {isValidating && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                )}
                                <span className="text-sm">{uploadStatus}</span>
                            </div>
                        )}

                        {/* Continue button */}
                        {selectedFile && !isValidating && (
                            <button 
                                onClick={handleContinueImport}
                                disabled={isNavigating}
                                className={`mt-4 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg ${
                                    isNavigating 
                                        ? 'bg-gray-500 text-white cursor-not-allowed' 
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2 justify-center">
                                    {isNavigating && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    )}
                                    <span>{isNavigating ? 'Preparing...' : 'Continue with import'}</span>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
