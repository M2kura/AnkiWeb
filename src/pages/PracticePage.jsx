import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function PracticePage() {
	const { deckId } = useParams()
	const navigate = useNavigate()
	const [loading, setLoading] = useState(true)
	const [deckData, setDeckData] = useState(null)

	useEffect(() => {
		loadDeckData()
	}, [deckId])

	const loadDeckData = async () => {
		try {
			setLoading(true)

			// Load deck data from localStorage
			const deckKey = `ankiweb_deck_${deckId}`
			const storedDeck = localStorage.getItem(deckKey)

			if (!storedDeck) {
				console.error('Deck not found in localStorage:', deckKey)
				setDeckData(null)
				return
			}

			const parsedDeck = JSON.parse(storedDeck)
			console.log('Loaded deck data:', parsedDeck)

			setDeckData(parsedDeck)

		} catch (error) {
			console.error('Error loading deck:', error)
			setDeckData(null)
		} finally {
			setLoading(false)
		}
	}

	const handleBackToDeck = () => {
		navigate('/')
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
					<p className="text-gray-600">Loading deck...</p>
				</div>
			</div>
		)
	}

	if (!deckData) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600 mb-4">Deck not found</p>
					<button
						onClick={handleBackToDeck}
						className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
					>
						Back to Home
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-6 max-w-4xl">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{deckData.name}</h1>
						<p className="text-gray-600">{deckData.cards?.length || 0} cards to practice</p>
					</div>
					<button
						onClick={handleBackToDeck}
						className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
					>
						← Back to Home
					</button>
				</div>

				{/* Main Practice Area */}
				<div className="bg-white rounded-lg shadow-sm p-8">
					<div className="text-center">
						<div className="text-sm text-gray-500 mb-4">Card 1 of {deckData.cards?.length || 0}</div>

						{/* Card Display Area */}
						<div className="bg-gray-50 rounded-lg p-8 mb-6 min-h-[200px] flex items-center justify-center">
							<div className="text-xl text-gray-700">
								{/* This will show the card content */}
								Practice area coming soon...
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-4 justify-center">
							<button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg">
								Show Answer
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
