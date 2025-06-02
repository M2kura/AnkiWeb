import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { playSound, toggleMute, isSoundMuted } from '../utils/soundEffects'

export default function PracticePage() {
	const { deckId } = useParams()
	const navigate = useNavigate()
	const [loading, setLoading] = useState(true)
	const [deckData, setDeckData] = useState(null)
	const [currentCardIndex, setCurrentCardIndex] = useState(0)
	const [showAnswer, setShowAnswer] = useState(false)
	const [isFlipping, setIsFlipping] = useState(false)
	const [isMuted, setIsMuted] = useState(isSoundMuted())
	const [practiceStats, setPracticeStats] = useState({
		correct: 0,
		incorrect: 0,
		remaining: 0
	})
	const progressBarRef = useRef(null)
	const [progressColor, setProgressColor] = useState('#2563eb')

	useEffect(() => {
		loadDeckData()
	}, [deckId])

	useEffect(() => {
		if (deckData) {
			setPracticeStats(prev => ({
				...prev,
				remaining: deckData.cards.length
			}))
		}
	}, [deckData])

	// Add keyboard event listener
	useEffect(() => {
		const handleKeyPress = (event) => {
			// Only handle keyboard events if we have deck data
			if (!deckData) return

			// Spacebar to toggle answer
			if (event.code === 'Space') {
				event.preventDefault() // Prevent page scroll
				handleToggleAnswer()
			}
			// Left arrow for incorrect
			else if (event.code === 'ArrowLeft' && showAnswer) {
				handleNextCard(false)
			}
			// Right arrow for correct
			else if (event.code === 'ArrowRight' && showAnswer) {
				handleNextCard(true)
			}
		}

		window.addEventListener('keydown', handleKeyPress)
		return () => window.removeEventListener('keydown', handleKeyPress)
	}, [deckData, showAnswer]) // Re-run effect when these values change

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

	const handleToggleAnswer = () => {
		setIsFlipping(true)
		// Play flip sound
		playSound('flip')
		// Wait for flip animation to complete before changing content
		setTimeout(() => {
			setShowAnswer(!showAnswer)
			setIsFlipping(false)
		}, 150) // Half of the animation duration
	}

	const handleNextCard = (wasCorrect) => {
		// Update stats
		setPracticeStats(prev => ({
			correct: wasCorrect ? prev.correct + 1 : prev.correct,
			incorrect: !wasCorrect ? prev.incorrect + 1 : prev.incorrect,
			remaining: prev.remaining - 1
		}))

		// Move to next card or finish
		if (currentCardIndex < deckData.cards.length - 1) {
			setCurrentCardIndex(prev => prev + 1)
			setShowAnswer(false)
		} else {
			// Practice session complete
			handlePracticeComplete()
		}
	}

	const handlePracticeComplete = () => {
		const accuracy = Math.round((practiceStats.correct / deckData.cards.length) * 100)
		const message = `Practice session complete!\n\n` +
			`Correct: ${practiceStats.correct}\n` +
			`Incorrect: ${practiceStats.incorrect}\n` +
			`Accuracy: ${accuracy}%\n\n` +
			`Would you like to practice again?`

		if (confirm(message)) {
			// Reset practice session
			setCurrentCardIndex(0)
			setShowAnswer(false)
			setPracticeStats({
				correct: 0,
				incorrect: 0,
				remaining: deckData.cards.length
			})
		} else {
			// Return to home
			navigate('/')
		}
	}

	const handleToggleSound = () => {
		const newMuteState = toggleMute()
		setIsMuted(newMuteState)
	}

	const handleChangeProgressColor = () => {
		const colors = ['#2563eb', '#059669', '#f59e42', '#dc2626']
		const nextColor = colors[(colors.indexOf(progressColor) + 1) % colors.length]
		setProgressColor(nextColor)
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

	const currentCard = deckData.cards[currentCardIndex]

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-6 max-w-4xl">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{deckData.name}</h1>
						<p className="text-gray-600">
							Card {currentCardIndex + 1} of {deckData.cards.length}
						</p>
					</div>
					<div className="flex items-center gap-4">
						{/* Progress Bar Color Icon */}
						<button
							onClick={handleChangeProgressColor}
							className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
							title="Change Progress Bar Color"
							aria-label="Change Progress Bar Color"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#fff" />
								<circle cx="8" cy="10" r="1.5" fill="#2563eb" />
								<circle cx="16" cy="10" r="1.5" fill="#059669" />
								<circle cx="9.5" cy="15" r="1.5" fill="#f59e42" />
								<circle cx="14.5" cy="15" r="1.5" fill="#dc2626" />
							</svg>
						</button>
						{/* Sound Toggle Button */}
						<button
							onClick={handleToggleSound}
							className="p-2 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
							title={isMuted ? "Unmute sound" : "Mute sound"}
						>
							{isMuted ? (
								<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
								</svg>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
								</svg>
							)}
						</button>
						{/* Back to Home Button */}
						<button
							onClick={handleBackToDeck}
							className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
						>
							← Back to Home
						</button>
					</div>
				</div>

				{/* Progress Bar */}
				<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
					<div className="flex justify-between text-sm text-gray-600 mb-2">
						<span>Correct: {practiceStats.correct}</span>
						<span>Incorrect: {practiceStats.incorrect}</span>
						<span>Remaining: {deckData.cards.length - practiceStats.correct - practiceStats.incorrect}</span>
					</div>
					
					{/* SVG Progress Bar */}
					<div className="w-full">
						<svg ref={progressBarRef} className="w-full h-3" viewBox="0 0 100 3">
							{/* Background track */}
							<rect 
								x="0" 
								y="0" 
								width="100" 
								height="3" 
								fill="#e5e7eb" 
								rx="1.5"
							/>
							{/* Progress fill */}
							<rect 
								x="0" 
								y="0" 
								width={((practiceStats.correct + practiceStats.incorrect) / deckData.cards.length) * 100} 
								height="3" 
								fill={progressColor} 
								rx="1.5"
								className="transition-all duration-300 ease-out"
							/>
						</svg>
					</div>
				</div>

				{/* Main Practice Area */}
				<div className="bg-white rounded-lg shadow-sm p-8">
					<div className="text-center">
						{/* Card Display Area with Flip Animation */}
						<div className="relative perspective-1000 mb-6">
							<div 
								className={`relative w-full min-h-[200px] transition-transform duration-300 transform-style-3d ${
									showAnswer ? 'rotate-y-180' : ''
								} ${isFlipping ? 'pointer-events-none' : ''}`}
							>
								{/* Front of card */}
								<div 
									className={`absolute w-full h-full backface-hidden ${
										showAnswer ? 'opacity-0' : 'opacity-100'
									}`}
								>
									<div className="bg-gray-50 rounded-lg p-8 min-h-[200px] flex items-center justify-center cursor-pointer"
										onClick={handleToggleAnswer}
									>
										<div className="text-xl text-gray-700 whitespace-pre-wrap">
											{currentCard.front}
										</div>
									</div>
								</div>

								{/* Back of card */}
								<div 
									className={`absolute w-full h-full backface-hidden rotate-y-180 ${
										showAnswer ? 'opacity-100' : 'opacity-0'
									}`}
								>
									<div className="bg-gray-50 rounded-lg p-8 min-h-[200px] flex items-center justify-center cursor-pointer"
										onClick={handleToggleAnswer}
									>
										<div className="text-xl text-gray-700 whitespace-pre-wrap">
											{currentCard.back}
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-4 justify-center">
							<button 
								onClick={handleToggleAnswer}
								className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
							>
								{showAnswer ? 'Show Question (Space)' : 'Show Answer (Space)'}
							</button>

							{showAnswer && (
								<div className="flex gap-4">
									<button 
										onClick={() => handleNextCard(false)}
										className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg"
									>
										Incorrect (←)
									</button>
									<button 
										onClick={() => handleNextCard(true)}
										className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg"
									>
										Correct (→)
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Add required CSS */}
			<style jsx>{`
				.perspective-1000 {
					perspective: 1000px;
				}
				.transform-style-3d {
					transform-style: preserve-3d;
				}
				.backface-hidden {
					backface-visibility: hidden;
				}
				.rotate-y-180 {
					transform: rotateY(180deg);
				}
			`}</style>
		</div>
	)
}
