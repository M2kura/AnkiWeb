import { executeQuery } from './sqlScriptLoader'

/**
 * Enhanced template processing for Anki cards
 */
function processAnkiTemplate(template, fields, fieldNames, frontContent = '') {
    if (!template) return ''

    let processed = template

    // Step 1: Replace field placeholders
    fieldNames.forEach((fieldName, index) => {
        const fieldValue = fields[index] || ''
        const placeholder = `{{${fieldName}}}`
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedPlaceholder, 'gi')
        processed = processed.replace(regex, fieldValue)
    })

    // Step 2: Replace {{FrontSide}} with actual front content
    if (frontContent) {
        processed = processed.replace(/\{\{FrontSide\}\}/gi, frontContent)
    }

    // Step 3: Handle cloze deletions
    processed = processed.replace(/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g, (match, num, text, hint) => {
        return `<span style="color: blue; font-weight: bold;">[${text}]</span>`
    })

    // Step 4: Clean up remaining unmatched placeholders
    processed = processed.replace(/\{\{[^}]+\}\}/g, '<span style="color: red; font-size: 0.8em;">[Missing Field]</span>')

    // Step 5: Handle media references
    processed = processed.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, (match, src) => {
        const filename = src.split('/').pop()
        return `<div style="border: 2px dashed #94a3b8; padding: 8px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 4px; font-size: 0.85em;">
            📷 Image: <strong>${filename}</strong><br>
            <small>(Media files not loaded in preview)</small>
        </div>`
    })

    // Handle audio files
    processed = processed.replace(/\[sound:([^\]]+)\]/gi, (match, filename) => {
        return `<div style="border: 2px dashed #94a3b8; padding: 8px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 4px; font-size: 0.85em;">
            🔊 Audio: <strong>${filename}</strong><br>
            <small>(Media files not loaded in preview)</small>
        </div>`
    })

    return processed
}

/**
 * Parse complete deck information from Anki database
 */
export function parseFullDeck(db) {
    try {
        const deckInfo = parseDeckInfo(db)
        const noteTypes = parseNoteTypes(db)
        const notes = parseNotes(db)
        const cards = parseCards(db)
        const statistics = getDeckStatistics(db)

        return {
            success: true,
            deckInfo,
            noteTypes,
            notes,
            cards,
            statistics,
            relationships: buildRelationships(notes, cards)
        }
    } catch (error) {
        console.error('Error parsing deck:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Extract deck metadata from col table
 */
export function parseDeckInfo(db) {
    try {
        const colData = executeQuery(db, "SELECT decks, conf FROM col")

        if (!colData.length || !colData[0].decks) {
            return { decks: {}, defaultDeck: null }
        }

        const decksData = JSON.parse(colData[0].decks)
        const decks = {}
        let defaultDeck = null

        // Convert deck data to more usable format
        Object.values(decksData).forEach(deck => {
            if (deck && deck.id && deck.name) {
                decks[deck.id] = {
                    id: deck.id,
                    name: deck.name,
                    description: deck.desc || '',
                    created: deck.mod ? new Date(deck.mod * 1000) : null,
                    config: deck.conf || 1
                }

                // Find default deck (usually ID 1 or name "Default")
                if (deck.id === 1 || deck.name === 'Default') {
                    defaultDeck = decks[deck.id]
                }
            }
        })

        return {
            decks,
            defaultDeck: defaultDeck || Object.values(decks)[0] || null,
            deckCount: Object.keys(decks).length
        }
    } catch (error) {
        console.error('Error parsing deck info:', error)
        return { decks: {}, defaultDeck: null, deckCount: 0 }
    }
}

/**
 * Extract note type definitions
 */
export function parseNoteTypes(db) {
    try {
        const colData = executeQuery(db, "SELECT models FROM col")

        if (!colData.length || !colData[0].models) {
            return { models: {}, modelCount: 0 }
        }

        const modelsData = JSON.parse(colData[0].models)
        const models = {}

        Object.values(modelsData).forEach(model => {
            if (model && model.id && model.name) {
                models[model.id] = {
                    id: model.id,
                    name: model.name,
                    fields: model.flds ? model.flds.map(f => f.name) : [],
                    templates: model.tmpls ? model.tmpls.map(t => ({
                        name: t.name,
                        front: t.qfmt,
                        back: t.afmt
                    })) : [],
                    css: model.css || '',
                    cardCount: model.tmpls ? model.tmpls.length : 1
                }
            }
        })

        return {
            models,
            modelCount: Object.keys(models).length
        }
    } catch (error) {
        console.error('Error parsing note types:', error)
        return { models: {}, modelCount: 0 }
    }
}

/**
 * Extract all notes with field data
 */
export function parseNotes(db) {
    try {
        // Get schema first to check available columns
        const schema = executeQuery(db, "PRAGMA table_info(notes)")
        const columns = schema.map(col => col.name)

        // Build query based on available columns
        const baseColumns = ['id', 'flds', 'sfld', 'csum', 'flags', 'data']
        const optionalColumns = ['did', 'mid', 'mod', 'usn', 'tags']

        const availableColumns = baseColumns.filter(col => columns.includes(col))
        const availableOptional = optionalColumns.filter(col => columns.includes(col))
        const allColumns = [...availableColumns, ...availableOptional]

        const query = `SELECT ${allColumns.join(', ')} FROM notes ORDER BY id`
        const notesData = executeQuery(db, query)

        return notesData.map(note => {
            // Parse fields (stored as \x1f separated values)
            const fields = note.flds ? note.flds.split('\x1f') : []

            // Parse tags
            const tags = note.tags ? note.tags.trim().split(/\s+/).filter(t => t) : []

            return {
                id: note.id,
                deckId: note.did || null,
                modelId: note.mid || null,
                fields: fields,
                sortField: note.sfld || '',
                tags: tags,
                checksum: note.csum || null,
                modified: note.mod ? new Date(note.mod * 1000) : null,
                flags: note.flags || 0
            }
        })
    } catch (error) {
        console.error('Error parsing notes:', error)
        return []
    }
}

/**
 * Extract all cards with status information
 */
export function parseCards(db) {
    try {
        // Get schema first
        const schema = executeQuery(db, "PRAGMA table_info(cards)")
        const columns = schema.map(col => col.name)

        // Build query based on available columns
        const baseColumns = ['id', 'nid', 'ord']
        const optionalColumns = ['did', 'queue', 'type', 'due', 'ivl', 'factor', 'reps', 'lapses', 'left', 'odue', 'odid', 'flags', 'data']

        const availableColumns = baseColumns.filter(col => columns.includes(col))
        const availableOptional = optionalColumns.filter(col => columns.includes(col))
        const allColumns = [...availableColumns, ...availableOptional]

        const query = `SELECT ${allColumns.join(', ')} FROM cards ORDER BY nid, ord`
        const cardsData = executeQuery(db, query)

        return cardsData.map(card => ({
            id: card.id,
            noteId: card.nid,
            deckId: card.did || null,
            templateIndex: card.ord || 0,
            queue: card.queue !== undefined ? card.queue : null,
            type: card.type !== undefined ? card.type : null,
            due: card.due || null,
            interval: card.ivl || 0,
            factor: card.factor || 0,
            reviews: card.reps || 0,
            lapses: card.lapses || 0,
            status: getCardStatus(card.queue),
            flags: card.flags || 0
        }))
    } catch (error) {
        console.error('Error parsing cards:', error)
        return []
    }
}

/**
 * Calculate deck statistics
 */
export function getDeckStatistics(db) {
    try {
        // Basic counts
        const cardCount = executeQuery(db, "SELECT COUNT(*) as count FROM cards")[0]?.count || 0
        const noteCount = executeQuery(db, "SELECT COUNT(*) as count FROM notes")[0]?.count || 0

        // Cards by status (if queue column exists)
        const schema = executeQuery(db, "PRAGMA table_info(cards)")
        const hasQueue = schema.some(col => col.name === 'queue')

        let cardsByStatus = []
        if (hasQueue) {
            cardsByStatus = executeQuery(db, `
                SELECT 
                    queue,
                    COUNT(*) as count
                FROM cards 
                GROUP BY queue 
                ORDER BY queue
            `).map(row => ({
                status: getCardStatus(row.queue),
                queue: row.queue,
                count: row.count
            }))
        }

        // Notes by deck (if did column exists in notes)
        const noteSchema = executeQuery(db, "PRAGMA table_info(notes)")
        const hasDeckId = noteSchema.some(col => col.name === 'did')

        let notesByDeck = []
        if (hasDeckId) {
            notesByDeck = executeQuery(db, `
                SELECT 
                    did as deck_id,
                    COUNT(*) as count
                FROM notes 
                GROUP BY did
                ORDER BY count DESC
            `)
        }

        return {
            totalCards: cardCount,
            totalNotes: noteCount,
            cardsByStatus,
            notesByDeck,
            averageCardsPerNote: noteCount > 0 ? (cardCount / noteCount).toFixed(1) : 0
        }
    } catch (error) {
        console.error('Error calculating statistics:', error)
        return {
            totalCards: 0,
            totalNotes: 0,
            cardsByStatus: [],
            notesByDeck: [],
            averageCardsPerNote: 0
        }
    }
}

/**
 * Build relationships between notes and cards
 */
export function buildRelationships(notes, cards) {
    // Group cards by note ID
    const cardsByNote = {}
    cards.forEach(card => {
        if (!cardsByNote[card.noteId]) {
            cardsByNote[card.noteId] = []
        }
        cardsByNote[card.noteId].push(card)
    })

    // Group notes by deck
    const notesByDeck = {}
    notes.forEach(note => {
        const deckId = note.deckId || 'unknown'
        if (!notesByDeck[deckId]) {
            notesByDeck[deckId] = []
        }
        notesByDeck[deckId].push(note)
    })

    return {
        cardsByNote,
        notesByDeck
    }
}

/**
 * Convert queue number to human-readable status
 */
function getCardStatus(queue) {
    switch (queue) {
        case 0: return 'New'
        case 1: return 'Learning'
        case 2: return 'Review'
        case -1: return 'Suspended'
        case -2: return 'Buried (scheduler)'
        case -3: return 'Buried (user)'
        default: return `Unknown (${queue})`
    }
}

/**
 * Get enhanced preview of cards with front/back content
 */
export function getCardPreviews(notes, cards, noteTypes, limit = 10) {
    try {
        const previews = []
        const notesById = {}

        // Create note lookup
        notes.forEach(note => {
            notesById[note.id] = note
        })

        // Generate previews
        for (let i = 0; i < Math.min(cards.length, limit); i++) {
            const card = cards[i]
            const note = notesById[card.noteId]

            if (!note) continue

            const noteType = noteTypes.models[note.modelId]
            if (!noteType) continue

            const template = noteType.templates[card.templateIndex]
            if (!template) continue

            // Process front side first
            const frontProcessed = processAnkiTemplate(
                template.front, 
                note.fields, 
                noteType.fields
            )

            // Process back side with front content available
            const backProcessed = processAnkiTemplate(
                template.back, 
                note.fields, 
                noteType.fields, 
                frontProcessed
            )

            previews.push({
                cardId: card.id,
                noteId: note.id,
                front: frontProcessed,
                back: backProcessed,
                status: card.status,
                noteType: noteType.name,
                templateName: template.name,
                fields: note.fields,
                fieldNames: noteType.fields,
                tags: note.tags
            })
        }

        return previews
    } catch (error) {
        console.error('Error generating enhanced card previews:', error)
        return []
    }
}
