import JSZip from 'jszip'
import { initializeSqlJs, loadDatabase, getTableNames } from './sqlScriptLoader'

/**
 * Validates if a file is a proper .apkg (Anki package) file WITHOUT media content
 * @param {File} file - The file to validate
 * @returns {Promise<{isValid: boolean, error?: string, zipContent?: JSZip, databaseBuffer?: ArrayBuffer}>}
 */
export async function validateApkgFile(file) {
    try {
        // Step 1: Try to read the file as a ZIP
        const zip = new JSZip()
        const zipContent = await zip.loadAsync(file)

        // Step 2: Check for required Anki files
        const foundFiles = Object.keys(zipContent.files)
        console.log('Files found in .apkg:', foundFiles)

        // Check if collection database exists (support multiple formats)
        const databaseFile = foundFiles.find(fileName => 
            fileName.startsWith('collection.') && (
                fileName.endsWith('.anki2') || 
                fileName.endsWith('.anki21') || 
                fileName.endsWith('.anki21b') ||
                fileName.endsWith('.anki21c')
            )
        )

        if (!databaseFile) {
            return {
                isValid: false,
                error: 'Invalid .apkg file: Missing collection database'
            }
        }

        // Check if media file exists
        const hasMedia = foundFiles.includes('media')

        if (!hasMedia) {
            return {
                isValid: false,
                error: 'Invalid .apkg file: Missing media information'
            }
        }

        // Step 3: NEW - Check for media content files (smarter detection)
        const isAnkiDatabase = (fileName) => {
            return fileName.startsWith('collection.') && (
                fileName.endsWith('.anki2') || 
                fileName.endsWith('.anki21') || 
                fileName.endsWith('.anki21b') ||
                fileName.endsWith('.anki21c') ||
                fileName === 'collection.anki2' ||
                fileName === 'collection.anki21'
            )
        }
        
        const isSystemFile = (fileName) => {
            return fileName === 'media' || 
                   fileName === 'meta' ||     // Anki metadata file
                   isAnkiDatabase(fileName)
        }
        
        // Find any files that aren't system files (potential media)
        const potentialMediaFiles = foundFiles.filter(fileName => {
            // Skip directories
            if (zipContent.files[fileName].dir) {
                return false
            }
            
            return !isSystemFile(fileName)
        })

        // If there are potential media files, check if they're actually used
        if (potentialMediaFiles.length > 0) {
            console.log('Potential media files found:', potentialMediaFiles)
            
            // Check media manifest to see if these files are actually referenced
            const mediaFile = zipContent.file('media')
            let referencedMedia = []
            
            if (mediaFile) {
                try {
                    const mediaContent = await mediaFile.async('text')
                    
                    // Check if content looks like JSON (starts with { or [)
                    const trimmedContent = mediaContent.trim()
                    if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
                        const mediaInfo = JSON.parse(mediaContent)
                        referencedMedia = Object.values(mediaInfo)
                    } else {
                        // Binary or corrupted media file - treat as empty
                        console.warn('Media file appears to be binary or corrupted, treating as empty')
                        referencedMedia = []
                    }
                } catch (e) {
                    console.warn('Could not parse media manifest, treating as empty:', e.message)
                    referencedMedia = []
                }
            }
            
            // Filter to only files that are actually referenced in the manifest
            const actuallyUsedMedia = potentialMediaFiles.filter(fileName => 
                referencedMedia.includes(fileName)
            )
            
            if (actuallyUsedMedia.length > 0) {
                return {
                    isValid: false,
                    error: `Deck contains ${actuallyUsedMedia.length} referenced media file(s): ${actuallyUsedMedia.slice(0, 3).join(', ')}${actuallyUsedMedia.length > 3 ? '...' : ''}. Only text-only decks are supported.`
                }
            }
            
            // If there are unreferenced media files, warn but allow (they might be leftover)
            if (potentialMediaFiles.length > 0) {
                console.warn(`Found ${potentialMediaFiles.length} unreferenced files in .apkg (likely unused):`, potentialMediaFiles)
            }
        }

        // Step 4: Verify media manifest is empty or contains no media references
        const mediaFile = zipContent.file('media')
        if (mediaFile) {
            try {
                const mediaContent = await mediaFile.async('text')
                
                // Check if content looks like valid JSON
                const trimmedContent = mediaContent.trim()
                if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
                    const mediaInfo = JSON.parse(mediaContent)
                    const mediaEntries = Object.keys(mediaInfo)
                    
                    if (mediaEntries.length > 0) {
                        return {
                            isValid: false,
                            error: `Deck references ${mediaEntries.length} media file(s) in manifest. Only text-only decks are supported.`
                        }
                    }
                } else {
                    // Binary or corrupted media file - likely means no media references
                    console.warn('Media file appears to be binary/corrupted, assuming no media references')
                }
            } catch (e) {
                // If we can't parse the media file, assume it's empty/corrupted and continue
                console.warn('Could not parse media file, assuming no media references:', e.message)
            }
        }

        // Step 5: Extract and validate the database file
        const dbFile = zipContent.file(databaseFile)

        if (!dbFile) {
            return {
                isValid: false,
                error: 'Could not access database file'
            }
        }

        const dbContent = await dbFile.async('arraybuffer')
        if (dbContent.byteLength === 0) {
            return {
                isValid: false,
                error: 'Database file is empty'
            }
        }

        // Step 6: Basic SQLite header validation
        const headerBytes = new Uint8Array(dbContent.slice(0, 16))
        const sqliteHeader = 'SQLite format 3\0'
        const expectedHeader = new TextEncoder().encode(sqliteHeader)

        // Check first 15 bytes (excluding null terminator)
        const isValidSQLite = headerBytes.slice(0, 15).every((byte, index) => 
            byte === expectedHeader[index]
        )

        if (!isValidSQLite) {
            return {
                isValid: false,
                error: 'Database file is not a valid SQLite database'
            }
        }

        // Step 7: Try to load with sql.js to ensure it's readable
        try {
            await initializeSqlJs() // Ensure sql.js is ready
            const db = loadDatabase(dbContent)

            if (!db) {
                return {
                    isValid: false,
                    error: 'Database could not be loaded by SQL.js'
                }
            }

            // Get table names to verify it's an Anki database
            const tables = getTableNames(db)
            console.log('Database tables found:', tables)

            // Check for essential Anki tables
            const requiredTables = ['cards', 'notes', 'col']
            const missingTables = requiredTables.filter(table => !tables.includes(table))

            if (missingTables.length > 0) {
                db.close()
                return {
                    isValid: false,
                    error: `Not a valid Anki database: missing tables ${missingTables.join(', ')}`
                }
            }

            db.close() // Clean up test connection

        } catch (sqlError) {
            console.error('SQL.js validation error:', sqlError)
            return {
                isValid: false,
                error: `Database validation failed: ${sqlError.message}`
            }
        }

        // All checks passed - deck has no media content!
        return {
            isValid: true,
            zipContent: zipContent,
            databaseBuffer: dbContent,
            fileCount: foundFiles.length,
            databaseSize: dbContent.byteLength
        }

    } catch (error) {
        console.error('Error validating .apkg file:', error)
        return {
            isValid: false,
            error: `File validation failed: ${error.message}`
        }
    }
}

/**
 * Gets basic information about the .apkg file contents (updated for media-free validation)
 * @param {JSZip} zipContent - The loaded ZIP content
 * @returns {Promise<object>} Basic file information
 */
export async function getApkgInfo(zipContent) {
    try {
        const files = Object.keys(zipContent.files)

        // Get media info (should be empty for valid decks)
        const mediaFile = zipContent.file('media')
        let mediaInfo = {}
        if (mediaFile) {
            const mediaContent = await mediaFile.async('text')
            try {
                mediaInfo = JSON.parse(mediaContent)
            } catch (e) {
                console.warn('Could not parse media file:', e)
            }
        }

        // Count only system files (no media files should exist)
        const systemFiles = files.filter(f => 
            f === 'collection.anki2' || 
            f === 'collection.anki21' || 
            f === 'media' ||
            f.endsWith('.anki2') ||
            zipContent.files[f].dir
        )

        return {
            totalFiles: files.length,
            mediaFileCount: 0, // Should always be 0 for valid decks
            mediaInfo: mediaInfo,
            allFiles: files,
            systemFileCount: systemFiles.length
        }
    } catch (error) {
        console.error('Error getting .apkg info:', error)
        return {
            totalFiles: 0,
            mediaFileCount: 0,
            mediaInfo: {},
            allFiles: [],
            systemFileCount: 0
        }
    }
}

/**
 * Extract and load the Anki database from a validated .apkg file
 * @param {ArrayBuffer} databaseBuffer - The SQLite database buffer from validation
 * @returns {Promise<{success: boolean, database?: Object, error?: string}>}
 */
export async function loadAnkiDatabase(databaseBuffer) {
    try {
        await initializeSqlJs()
        const db = loadDatabase(databaseBuffer)

        if (!db) {
            return {
                success: false,
                error: 'Failed to load database'
            }
        }

        return {
            success: true,
            database: db
        }
    } catch (error) {
        console.error('Error loading Anki database:', error)
        return {
            success: false,
            error: error.message
        }
    }
}
