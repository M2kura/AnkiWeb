import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function DeckImportPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const [fileData, setFileData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get the file data passed from HomePage
        const { fileData, validationInfo } = location.state || {}

        if (!fileData || !validationInfo) {
            // No file data, redirect back to home
            navigate('/')
            return
        }

        // Convert base64 back to File object
        try {
            const base64Data = fileData.base64
            // Remove the data URL prefix (e.g., "data:application/octet-stream;base64,")
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

            setFileData({ file, validationResult: validationInfo })
            setLoading(false)
        } catch (error) {
            console.error('Error reconstructing file:', error)
            navigate('/')
        }
    }, [location.state, navigate])

    const handleGoBack = () => {
        navigate('/')
    }

    const handleConfirmImport = () => {
        // TODO: In next step, we'll actually parse and save the deck
        console.log('Import confirmed for:', fileData.file.name)
        alert('Import functionality will be implemented in the next step!')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading deck information...</p>
                </div>
            </div>
        )
    }

    if (!fileData) {
        return null // Will redirect to home
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
                                <span className="font-medium text-gray-700">Total Files:</span>
                                <span className="ml-2 text-gray-900">{validationResult.totalFiles || 'Unknown'}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Media Files:</span>
                                <span className="ml-2 text-gray-900">{validationResult.mediaFileCount || 0}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Database Size:</span>
                                <span className="ml-2 text-gray-900">
                                    {validationResult.databaseSize ? (validationResult.databaseSize / 1024).toFixed(1) + ' KB' : 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deck Preview Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Deck Preview</h2>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-yellow-800">
                            📋 Deck parsing will be implemented in the next step. 
                            Here you'll see the deck name, description, and card count.
                        </p>
                    </div>
                </div>

                {/* Cards Preview Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cards Preview</h2>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-yellow-800">
                            🃏 Card list will be implemented in the next step. 
                            Here you'll see a preview of the flashcards with front/back content.
                        </p>
                    </div>
                </div>

                {/* Import Actions */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Import Options</h2>

                    <div className="space-y-4">
                        {/* Import Settings (placeholder) */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">Import Settings</h3>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input type="checkbox" className="rounded" defaultChecked />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Import all cards (including buried/suspended)
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" className="rounded" defaultChecked />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Import media files
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
                                Confirm Import
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
