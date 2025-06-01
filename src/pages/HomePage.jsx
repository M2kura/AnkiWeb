import { useRef, useState } from 'react'

export default function HomePage() {
    const fileInputRef = useRef(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadStatus, setUploadStatus] = useState('')

    const handleImportClick = () => {
        // Trigger the hidden file input
        fileInputRef.current?.click()
    }

    const handleFileSelect = (event) => {
        const file = event.target.files[0]

        if (!file) {
            setSelectedFile(null)
            setUploadStatus('')
            return
        }

        // Basic validation: check file extension
        if (!file.name.toLowerCase().endsWith('.apkg')) {
            setUploadStatus('Please select a valid .apkg file')
            setSelectedFile(null)
            return
        }

        // Basic validation: check file size (max 50MB)
        const maxSize = 50 * 1024 * 1024 // 50MB
        if (file.size > maxSize) {
            setUploadStatus('File too large. Maximum size is 50MB')
            setSelectedFile(null)
            return
        }

        setSelectedFile(file)
        setUploadStatus(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

        // TODO: In next step, we'll validate the file format here
        console.log('File selected:', file)
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
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            AnkiWeb helps you learn efficiently using spaced repetition. 
                            Create or import custom flashcards and retain 
                            information better than ever before.
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg">
                                Create new deck
                            </button>

                            <button 
                                onClick={handleImportClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Import deck
                            </button>
                        </div>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".apkg"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Status message */}
                        {uploadStatus && (
                            <div className={`mt-4 p-3 rounded-lg ${
                                selectedFile 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                                {uploadStatus}
                            </div>
                        )}

                        {/* Continue button (only show when file is selected) */}
                        {selectedFile && (
                            <button 
                                onClick={() => console.log('TODO: Navigate to import page')}
                                className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Continue with import
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
