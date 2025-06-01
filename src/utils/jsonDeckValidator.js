/**
 * Validates and processes JSON flashcard deck files
 * @param {File} file - The JSON file to validate
 * @returns {Promise<{isValid: boolean, error?: string, deckData?: Object}>}
 */
export async function validateJsonDeck(file) {
    try {
        // Check file extension
        if (!file.name.toLowerCase().endsWith('.json')) {
            return {
                isValid: false,
                error: 'Please select a valid .json file'
            }
        }

        // Check file size (max 10MB for JSON)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return {
                isValid: false,
                error: 'File too large. Maximum size is 10MB'
            }
        }

        // Read and parse JSON
        const text = await file.text()
        let deckData

        try {
            deckData = JSON.parse(text)
        } catch (parseError) {
            return {
                isValid: false,
                error: 'Invalid JSON format. Please check your file syntax.'
            }
        }

        // Validate deck structure
        const validation = validateDeckStructure(deckData)
        if (!validation.isValid) {
            return validation
        }

        // Process and normalize the deck data
        const processedDeck = processDeckData(deckData)

        return {
            isValid: true,
            deckData: processedDeck
        }

    } catch (error) {
        console.error('Error validating JSON deck:', error)
        return {
            isValid: false,
            error: `File validation failed: ${error.message}`
        }
    }
}

/**
 * Validates the structure of deck data
 * @param {Object} deckData - The parsed JSON data
 * @returns {Object} Validation result
 */
function validateDeckStructure(deckData) {
    // Check if it's an object
    if (!deckData || typeof deckData !== 'object' || Array.isArray(deckData)) {
        return {
            isValid: false,
            error: 'Deck must be a JSON object'
        }
    }

    // Check required fields
    if (!deckData.name || typeof deckData.name !== 'string' || deckData.name.trim().length === 0) {
        return {
            isValid: false,
            error: 'Deck must have a valid "name" field'
        }
    }

    if (!deckData.cards || !Array.isArray(deckData.cards)) {
        return {
            isValid: false,
            error: 'Deck must have a "cards" array'
        }
    }

    if (deckData.cards.length === 0) {
        return {
            isValid: false,
            error: 'Deck must contain at least one card'
        }
    }

    // Validate each card
    for (let i = 0; i < deckData.cards.length; i++) {
        const card = deckData.cards[i]
        const cardValidation = validateCard(card, i + 1)
        if (!cardValidation.isValid) {
            return cardValidation
        }
    }

    return { isValid: true }
}

/**
 * Validates a single card structure
 * @param {Object} card - The card to validate
 * @param {number} cardNumber - Card number for error messages
 * @returns {Object} Validation result
 */
function validateCard(card, cardNumber) {
    if (!card || typeof card !== 'object' || Array.isArray(card)) {
        return {
            isValid: false,
            error: `Card ${cardNumber} must be an object`
        }
    }

    // Check required fields
    if (!card.front || typeof card.front !== 'string' || card.front.trim().length === 0) {
        return {
            isValid: false,
            error: `Card ${cardNumber} must have a valid "front" field`
        }
    }

    if (!card.back || typeof card.back !== 'string' || card.back.trim().length === 0) {
        return {
            isValid: false,
            error: `Card ${cardNumber} must have a valid "back" field`
        }
    }

    // Check field lengths (prevent extremely long cards)
    if (card.front.length > 5000) {
        return {
            isValid: false,
            error: `Card ${cardNumber} front side is too long (max 5000 characters)`
        }
    }

    if (card.back.length > 5000) {
        return {
            isValid: false,
            error: `Card ${cardNumber} back side is too long (max 5000 characters)`
        }
    }

    return { isValid: true }
}

/**
 * Processes and normalizes deck data
 * @param {Object} deckData - The raw deck data
 * @returns {Object} Processed deck data
 */
function processDeckData(deckData) {
    return {
        name: deckData.name.trim(),
        description: deckData.description ? deckData.description.trim() : '',
        created: deckData.created || new Date().toISOString(),
        cards: deckData.cards.map((card, index) => ({
            id: card.id || (index + 1), // Auto-generate ID if missing
            front: card.front.trim(),
            back: card.back.trim()
        }))
    }
}

/**
 * Gets basic information about the JSON deck
 * @param {Object} deckData - The processed deck data
 * @returns {Object} Deck information
 */
export function getJsonDeckInfo(deckData) {
    if (!deckData || !deckData.cards) {
        return {
            totalCards: 0,
            hasDescription: false,
            averageCardLength: 0
        }
    }

    const totalCards = deckData.cards.length
    const hasDescription = !!(deckData.description && deckData.description.length > 0)
    
    // Calculate average card content length
    const totalLength = deckData.cards.reduce((sum, card) => 
        sum + card.front.length + card.back.length, 0
    )
    const averageCardLength = totalCards > 0 ? Math.round(totalLength / totalCards) : 0

    return {
        totalCards,
        hasDescription,
        averageCardLength,
        deckName: deckData.name
    }
}
