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
    const [isDragging, setIsDragging] = useState(false)

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
        console.log('File selected via input:', file)
        await processFile(file)
    }

    const processFile = async (file) => {
        console.log('Processing file:', file ? file.name : 'No file')
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
            console.error('Error validating file:', error)
            setUploadStatus('Error validating file. Please try again.')
            setSelectedFile(null)
            setValidationResult(null)
        } finally {
            setIsValidating(false)
        }
    }

    const handleDragEnter = (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('Drag Enter')
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('Drag Leave')
        setIsDragging(false)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        // console.log('Drag Over') // Avoid spamming console
    }

    const handleDrop = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('Drop event triggered')
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        console.log('Dropped file:', file ? file.name : 'No file detected')
        if (file) {
            await processFile(file)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Welcome to AnkiWeb
                        </h1>
                        <p className="text-xl text-gray-600">
                            Create and practice flashcards with ease
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left column - Create new deck */}
                        <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col h-full min-h-[260px]">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                                Create New Deck
                            </h2>
                            <p className="text-gray-600 mb-6 flex-grow">
                                Start from scratch and build your own flashcard deck
                            </p>
                            <div className="mt-auto">
                                <button 
                                    onClick={() => navigate('/deck-editor')}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg h-12"
                                >
                                    Create new deck
                                </button>
                            </div>
                        </div>

                        {/* Right column - Import deck */}
                        <div 
                            className={`bg-white rounded-lg shadow-sm p-6 flex flex-col h-full min-h-[260px] ${
                                isDragging ? 'border-2 border-blue-500 bg-blue-50' : ''
                            }`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                                Import Deck
                            </h2>
                            <p className="text-gray-600 mb-6 flex-grow">
                                Import an existing JSON flashcard deck
                            </p>
                            <div className="mt-auto flex flex-col gap-2">
                                <button 
                                    onClick={handleImportClick}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg h-12"
                                >
                                    Choose JSON file
                                </button>
                                <div className="text-center text-gray-500 text-sm mt-2">
                                    or drag and drop your JSON file here
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
                                    <div className={`mt-4 p-3 rounded-lg ${
                                        uploadStatus.startsWith('✓') 
                                            ? 'bg-green-50 text-green-700' 
                                            : 'bg-red-50 text-red-700'
                                    }`}>
                                        {uploadStatus}
                                    </div>
                                )}
                                {/* Continue button */}
                                {selectedFile && validationResult && (
                                    <button
                                        onClick={handleContinueImport}
                                        disabled={isNavigating}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-12 mt-2"
                                    >
                                        {isNavigating ? 'Importing...' : 'Continue Import'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
