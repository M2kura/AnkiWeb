import { executeQuery } from './sqlScriptLoader'

/**
 * Detect media references in text content
 * @param {string} content - HTML or text content to scan
 * @returns {Array} Array of detected media references
 */
function detectMediaReferences(content) {
    if (!content) return []

    const mediaFound = []

    // Check for image tags
    const imgMatches = content.match(/<img[^>]*>/gi)
    if (imgMatches) {
        imgMatches.forEach(match => {
            const srcMatch = match.match(/src=["']([^"']+)["']/i)
            if (srcMatch) {
                mediaFound.push({
                    type: 'image',
                    reference: srcMatch[1],
                    fullTag: match
                })
            }
        })
    }

    // Check for audio references [sound:filename]
    const audioMatches = content.match(/\[sound:[^\]]+\]/gi)
    if (audioMatches) {
        audioMatches.forEach(match => {
            const filename = match.replace(/\[sound:|\]/g, '')
            mediaFound.push({
                type: 'audio',
                reference: filename,
                fullTag: match
            })
        })
    }

    // Check for video tags
    const videoMatches = content.match(/<video[^>]*>.*?<\/video>/gis)
    if (videoMatches) {
        videoMatches.forEach(match => {
            mediaFound.push({
                type: 'video',
                reference: 'embedded video',
                fullTag: match
            })
        })
    }

    // Check for audio tags
    const audioTagMatches = content.match(/<audio[^>]*>.*?<\/audio>/gis)
    if (audioTagMatches) {
        audioTagMatches.forEach(match => {
            mediaFound.push({
                type: 'audio_tag',
                reference: 'embedded audio',
                fullTag: match
            })
        })
    }

    // Check for object/embed tags (could be media)
    const objectMatches = content.match(/<(object|embed)[^>]*>.*?<\/\1>/gis)
    if (objectMatches) {
        objectMatches.forEach(match => {
            mediaFound.push({
                type: 'embedded_object',
                reference: 'embedded media object',
                fullTag: match
            })
        })
    }

    return mediaFound
}

/**
 * Enhanced template processing for Anki cards with media detection
 */
function processAnkiTemplate(template, fields, fieldNames, frontContent = '') {
    if (!template) return { content: '', mediaFound: [] }

    let processed = template
    let allMediaFound = []

    // Step 1: Replace field placeholders and collect media from fields
    fieldNames.forEach((fieldName, index) => {
        const fieldValue = fields[index] || ''

        // Check for media in field content
        const fieldMedia = detectMediaReferences(fieldValue)
        allMediaFound.push(...fieldMedia)

        const placeholder = `{{${fieldName}}}`
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedPlaceholder, 'gi')
        processed = processed.replace(regex, fieldValue)
    })

    // Step 2: Replace {{FrontSide}} with actual front content
    if (frontContent) {
        processed = processed.replace(/\{\{FrontSide\}\}/gi, frontContent)
    }

    // Step 3: Check for media in the processed template
    const templateMedia = detectMediaReferences(processed)
    allMediaFound.push(...templateMedia)

    // Step 4: Handle cloze deletions (text only)
    processed = processed.replace(/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g, (match, num, text, hint) => {
        return `<span style="color: blue; font-weight: bold;">[${text}]</span>`
    })

    // Step 5: Clean up remaining unmatched placeholders
    processed = processed.replace(/\{\{[^}]+\}\}/g, '<span style="color: red; font-size: 0.8em;">[Missing Field]</span>')

    return {
        content: processed,
        mediaFound: allMediaFound
    }
}

/**
 * Parse complete deck information from Anki database with media validation
 */
export function parseFullDeck(db) {
    try {
        const deckInfo = parseDeckInfo(db)
        const noteTypes = parseNoteTypes(db)
        const notes = parseNotes(db)
        const cards = parseCards(db)
        const statistics = getDeckStatistics(db)

        // NEW: Check for media content in note types and cards
        const mediaValidation = validateDeckForMedia(noteTypes, notes, cards)

        if (!mediaValidation.isValid) {
            return {
                success: false,
                error: mediaValidation.error,
                mediaDetails: mediaValidation.details
            }
        }

        return {
            success: true,
            deckInfo,
            noteTypes,
            notes,
            cards,
            statistics,
            relationships: buildRelationships(notes, cards),
            mediaValidation: mediaValidation
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
 * Validate deck content for media references
 * @param {Object} noteTypes - Parsed note types
 * @param {Array} notes - Parsed notes
 * @param {Array} cards - Parsed cards  
 * @returns {Object} Validation result
 */
function validateDeckForMedia(noteTypes, notes, cards) {
    const mediaIssues = []

    // Check note type templates for media
    Object.values(noteTypes.models).forEach(model => {
        model.templates.forEach(template => {
            // Check front template
            const frontMedia = detectMediaReferences(template.front)
            if (frontMedia.length > 0) {
                mediaIssues.push({
                    location: `Note type "${model.name}" - Template "${template.name}" (Front)`,
                    media: frontMedia
                })
            }

            // Check back template  
            const backMedia = detectMediaReferences(template.back)
            if (backMedia.length > 0) {
                mediaIssues.push({
                    location: `Note type "${model.name}" - Template "${template.name}" (Back)`,
                    media: backMedia
                })
            }
        })

        // Check CSS for media references
        const cssMedia = detectMediaReferences(model.css)
        if (cssMedia.length > 0) {
            mediaIssues.push({
                location: `Note type "${model.name}" - CSS`,
                media: cssMedia
            })
        }
    })

    // Check note field content for media
    notes.forEach((note, noteIndex) => {
        note.fields.forEach((field, fieldIndex) => {
            const fieldMedia = detectMediaReferences(field)
            if (fieldMedia.length > 0) {
                const model = Object.values(noteTypes.models).find(m => m.id === note.modelId)
                const fieldName = model?.fields?.[fieldIndex] || `Field ${fieldIndex + 1}`

                mediaIssues.push({
                    location: `Note ${noteIndex + 1} - ${fieldName}`,
                    media: fieldMedia
                })
            }
        })
    })

    if (mediaIssues.length > 0) {
        const totalMediaReferences = mediaIssues.reduce((sum, issue) => sum + issue.media.length, 0)

        return {
            isValid: false,
            error: `Deck contains ${totalMediaReferences} media reference(s) in ${mediaIssues.length} location(s). Only text-only content is supported.`,
            details: mediaIssues
        }
    }

    return {
        isValid: true,
        details: []
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
 * Get enhanced preview of cards with front/back content (media-free version)
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

            // Process front side first (returns content and media found)
            const frontResult = processAnkiTemplate(
                template.front, 
                note.fields, 
                noteType.fields
            )

            // Process back side with front content available
            const backResult = processAnkiTemplate(
                template.back, 
                note.fields, 
                noteType.fields, 
                frontResult.content
            )

            previews.push({
                cardId: card.id,
                noteId: note.id,
                front: frontResult.content,
                back: backResult.content,
                status: card.status,
                noteType: noteType.name,
                templateName: template.name,
                fields: note.fields,
                fieldNames: noteType.fields,
                tags: note.tags,
                mediaFound: [...frontResult.mediaFound, ...backResult.mediaFound]
            })
        }

        return previews
    } catch (error) {
        console.error('Error generating enhanced card previews:', error)
        return []
    }
}
