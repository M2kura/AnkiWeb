import { useState, useRef } from 'react'
import { validateApkgFile, loadAnkiDatabase } from '../utils/apkgValidator'
import { executeQuery, getTableNames } from '../utils/sqlScriptLoader'

export default function DatabaseTest() {
    const fileInputRef = useRef(null)
    const [testStatus, setTestStatus] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [databaseInfo, setDatabaseInfo] = useState(null)

    const handleFileSelect = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        setIsLoading(true)
        setTestStatus('Validating .apkg file...')
        setDatabaseInfo(null)

        try {
            // Step 1: Validate the file and extract database
            const validation = await validateApkgFile(file)
            
            if (!validation.isValid) {
                setTestStatus(`❌ Validation failed: ${validation.error}`)
                setIsLoading(false)
                return
            }

            setTestStatus('Loading database with SQL.js...')

            // Step 2: Load the database
            const dbResult = await loadAnkiDatabase(validation.databaseBuffer)
            
            if (!dbResult.success) {
                setTestStatus(`❌ Database loading failed: ${dbResult.error}`)
                setIsLoading(false)
                return
            }

            setTestStatus('Analyzing database structure...')

            // Step 3: Analyze the database
            const db = dbResult.database
            const tables = getTableNames(db)
            
            // Get some basic stats
            const stats = {}
            
            try {
                // First, let's discover the actual schema
                const cardsSchema = executeQuery(db, "PRAGMA table_info(cards)")
                const notesSchema = executeQuery(db, "PRAGMA table_info(notes)")
                const colSchema = executeQuery(db, "PRAGMA table_info(col)")
                
                stats.schemas = {
                    cards: cardsSchema,
                    notes: notesSchema,
                    col: colSchema
                }

                // Build queries based on actual schema
                const cardColumns = cardsSchema.map(col => col.name)
                const noteColumns = notesSchema.map(col => col.name)
                
                console.log('Available card columns:', cardColumns)
                console.log('Available note columns:', noteColumns)

                // Count all cards
                const cardCount = executeQuery(db, "SELECT COUNT(*) as count FROM cards")
                stats.cardCount = cardCount[0]?.count || 0

                // Count cards by queue if queue column exists
                if (cardColumns.includes('queue')) {
                    const cardsByQueue = executeQuery(db, `
                        SELECT 
                            queue,
                            COUNT(*) as count,
                            CASE queue
                                WHEN 0 THEN 'New'
                                WHEN 1 THEN 'Learning'
                                WHEN 2 THEN 'Review'
                                WHEN -1 THEN 'Suspended'
                                WHEN -2 THEN 'Buried (scheduler)'
                                WHEN -3 THEN 'Buried (user)'
                                ELSE 'Unknown (' || queue || ')'
                            END as status
                        FROM cards 
                        GROUP BY queue 
                        ORDER BY queue
                    `)
                    stats.cardsByQueue = cardsByQueue
                } else {
                    stats.cardsByQueue = [{status: 'Unknown - no queue column', count: stats.cardCount}]
                }

                // Count notes  
                const noteCount = executeQuery(db, "SELECT COUNT(*) as count FROM notes")
                stats.noteCount = noteCount[0]?.count || 0

                // Count notes by deck if deck column exists
                const deckColumn = noteColumns.find(col => 
                    col === 'did' || col === 'deck_id' || col === 'deckId' || col.toLowerCase().includes('deck')
                )
                
                if (deckColumn) {
                    const notesByDeck = executeQuery(db, `
                        SELECT 
                            ${deckColumn} as deck_id,
                            COUNT(*) as count
                        FROM notes 
                        GROUP BY ${deckColumn}
                        ORDER BY count DESC
                    `)
                    stats.notesByDeck = notesByDeck
                } else {
                    stats.notesByDeck = [{deck_id: 'unknown', count: stats.noteCount}]
                }

                // Get deck info from col table
                const colColumns = colSchema.map(col => col.name)
                if (colColumns.includes('decks')) {
                    const decks = executeQuery(db, "SELECT decks FROM col")
                    if (decks.length > 0 && decks[0].decks) {
                        try {
                            const decksData = JSON.parse(decks[0].decks)
                            stats.decksData = decksData
                            
                            // Create deck name lookup
                            stats.deckNames = {}
                            Object.values(decksData).forEach(deck => {
                                if (deck && deck.id && deck.name) {
                                    stats.deckNames[deck.id] = deck.name
                                }
                            })
                        } catch (e) {
                            console.warn('Could not parse deck data:', e)
                            stats.decksData = 'Could not parse deck data: ' + e.message
                        }
                    }
                }

                // Get model info (card types)
                if (colColumns.includes('models')) {
                    const models = executeQuery(db, "SELECT models FROM col")
                    if (models.length > 0 && models[0].models) {
                        try {
                            const modelsData = JSON.parse(models[0].models)
                            stats.modelsData = modelsData
                            
                            // Count cards by model if mid column exists
                            const modelColumn = noteColumns.find(col => 
                                col === 'mid' || col === 'model_id' || col === 'modelId' || col.toLowerCase().includes('model')
                            )
                            
                            if (modelColumn) {
                                const cardsByModel = executeQuery(db, `
                                    SELECT 
                                        notes.${modelColumn} as model_id,
                                        COUNT(cards.id) as card_count,
                                        COUNT(DISTINCT notes.id) as note_count
                                    FROM notes 
                                    LEFT JOIN cards ON notes.id = cards.nid
                                    GROUP BY notes.${modelColumn}
                                `)
                                stats.cardsByModel = cardsByModel
                            }
                        } catch (e) {
                            console.warn('Could not parse model data:', e)
                            stats.modelsData = 'Could not parse model data: ' + e.message
                        }
                    }
                }

                // Get sample data with safe column access
                const sampleCards = executeQuery(db, `
                    SELECT cards.*, notes.id as note_id
                    FROM cards 
                    LEFT JOIN notes ON cards.nid = notes.id 
                    LIMIT 5
                `)
                stats.sampleCards = sampleCards

                const sampleNotes = executeQuery(db, `
                    SELECT 
                        notes.*,
                        COUNT(cards.id) as card_count
                    FROM notes 
                    LEFT JOIN cards ON notes.id = cards.nid
                    GROUP BY notes.id
                    LIMIT 5
                `)
                stats.sampleNotes = sampleNotes

                // Check for orphaned cards
                const orphanedCards = executeQuery(db, `
                    SELECT COUNT(*) as count 
                    FROM cards 
                    WHERE nid NOT IN (SELECT id FROM notes)
                `)
                stats.orphanedCards = orphanedCards[0]?.count || 0

            } catch (queryError) {
                console.error('Error running analysis queries:', queryError)
                stats.error = queryError.message
            }

            db.close() // Clean up

            setDatabaseInfo({
                fileName: file.name,
                fileSize: file.size,
                tables: tables,
                stats: stats,
                validationInfo: validation
            })

            setTestStatus('✅ Database loaded and analyzed successfully!')

        } catch (error) {
            console.error('Database test error:', error)
            setTestStatus(`❌ Error: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const selectFile = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6 m-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Extraction Test</h2>
            
            <div className="space-y-4">
                <div>
                    <button
                        onClick={selectFile}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            isLoading 
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isLoading ? 'Processing...' : 'Select .apkg file'}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".apkg"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>

                {testStatus && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${
                        testStatus.includes('✅') 
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : testStatus.includes('❌')
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                        {isLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        )}
                        <span>{testStatus}</span>
                    </div>
                )}

                {databaseInfo && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-gray-900">Database Analysis Results</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">File:</span>
                                <span className="ml-2">{databaseInfo.fileName}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Size:</span>
                                <span className="ml-2">{(databaseInfo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Tables:</span>
                                <span className="ml-2">{databaseInfo.tables.length}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Total Cards:</span>
                                <span className="ml-2">{databaseInfo.stats.cardCount}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Total Notes:</span>
                                <span className="ml-2">{databaseInfo.stats.noteCount}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Orphaned Cards:</span>
                                <span className="ml-2">{databaseInfo.stats.orphanedCards || 0}</span>
                            </div>
                        </div>

                        {databaseInfo.stats.cardsByQueue && (
                            <div>
                                <span className="font-medium text-gray-700">Cards by Status:</span>
                                <div className="ml-2 mt-1">
                                    {databaseInfo.stats.cardsByQueue.map((item, index) => (
                                        <div key={index} className="text-xs">
                                            <span className="font-mono">{item.status}:</span>
                                            <span className="ml-2">{item.count} cards</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {databaseInfo.stats.deckNames && databaseInfo.stats.notesByDeck && (
                            <div>
                                <span className="font-medium text-gray-700">Notes by Deck:</span>
                                <div className="ml-2 mt-1">
                                    {databaseInfo.stats.notesByDeck.map((item, index) => (
                                        <div key={index} className="text-xs">
                                            <span className="font-mono">
                                                {databaseInfo.stats.deckNames[item.deck_id] || `Deck ${item.deck_id}`}:
                                            </span>
                                            <span className="ml-2">{item.count} notes</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {databaseInfo.stats.cardsByModel && (
                            <div>
                                <span className="font-medium text-gray-700">Cards by Note Type:</span>
                                <div className="ml-2 mt-1">
                                    {databaseInfo.stats.cardsByModel.map((item, index) => (
                                        <div key={index} className="text-xs">
                                            <span className="font-mono">Model {item.model_id}:</span>
                                            <span className="ml-2">{item.note_count} notes → {item.card_count} cards</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {databaseInfo.stats.schemas && (
                            <div>
                                <span className="font-medium text-gray-700">Database Schema:</span>
                                <div className="ml-2 mt-1 space-y-2">
                                    <div>
                                        <strong className="text-xs">Cards table columns:</strong>
                                        <div className="text-xs text-gray-600 font-mono">
                                            {databaseInfo.stats.schemas.cards.map(col => col.name).join(', ')}
                                        </div>
                                    </div>
                                    <div>
                                        <strong className="text-xs">Notes table columns:</strong>
                                        <div className="text-xs text-gray-600 font-mono">
                                            {databaseInfo.stats.schemas.notes.map(col => col.name).join(', ')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <span className="font-medium text-gray-700">Database Tables:</span>
                            <div className="ml-2 text-xs text-gray-600">
                                {databaseInfo.tables.join(', ')}
                            </div>
                        </div>

                        {databaseInfo.stats.sampleNotes && (
                            <div>
                                <span className="font-medium text-gray-700">Sample Notes with Card Count:</span>
                                <div className="ml-2 mt-1 space-y-1">
                                    {databaseInfo.stats.sampleNotes.map((note, index) => (
                                        <div key={index} className="text-xs bg-white p-2 rounded border">
                                            <div><strong>Note ID:</strong> {note.id}</div>
                                            <div><strong>Cards:</strong> {note.card_count}</div>
                                            {note.flds && (
                                                <div><strong>Fields:</strong> {note.flds.length > 100 ? note.flds.substring(0, 100) + '...' : note.flds}</div>
                                            )}
                                            {note.sfld && (
                                                <div><strong>Sort Field:</strong> {note.sfld.length > 50 ? note.sfld.substring(0, 50) + '...' : note.sfld}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {databaseInfo.stats.sampleCards && (
                            <details className="mt-4">
                                <summary className="font-medium text-gray-700 cursor-pointer">Sample Cards (click to expand)</summary>
                                <pre className="ml-2 text-xs bg-white p-2 rounded border overflow-x-auto mt-2">
                                    {JSON.stringify(databaseInfo.stats.sampleCards.map(card => {
                                        // Only include fields that exist
                                        const cardSummary = {
                                            id: card.id,
                                            nid: card.nid || card.note_id
                                        }
                                        if (card.did !== undefined) cardSummary.did = card.did
                                        if (card.queue !== undefined) cardSummary.queue = card.queue
                                        if (card.type !== undefined) cardSummary.type = card.type
                                        if (card.ord !== undefined) cardSummary.ord = card.ord
                                        return cardSummary
                                    }), null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6 text-sm text-gray-600">
                <p><strong>What this enhanced test shows:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Validates the .apkg file structure (ZIP format)</li>
                    <li>Extracts and loads the SQLite database with SQL.js</li>
                    <li>Analyzes database structure and relationships</li>
                    <li><strong>Cards by Status:</strong> Shows New, Learning, Review, Suspended, Buried cards</li>
                    <li><strong>Deck breakdown:</strong> Notes count per deck</li>
                    <li><strong>Note types:</strong> How many cards each note generates</li>
                    <li><strong>Sample data:</strong> Preview of actual notes and cards</li>
                    <li>Detects orphaned cards (cards without notes)</li>
                </ul>
                <p className="mt-2 text-yellow-700">
                    <strong>Note:</strong> This analysis adapts to different Anki database versions. 
                    Check the "Database Schema" section to see what columns are available, and 
                    "Cards by Status" to understand why some cards might not be visible in normal study.
                </p>
            </div>
        </div>
    )
}
