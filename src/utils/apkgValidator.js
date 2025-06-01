import JSZip from 'jszip'
import { initializeSqlJs, loadDatabase, getTableNames } from './sqlScriptLoader'

/**
 * Validates if a file is a proper .apkg (Anki package) file
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

        // Check if collection.anki2 exists (main database)
        const hasDatabase = foundFiles.some(fileName => 
            fileName === 'collection.anki2' || fileName.endsWith('.anki2')
        )

        if (!hasDatabase) {
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

        // Step 3: Extract and validate the database file
        const dbFileName = foundFiles.find(f => f === 'collection.anki2' || f.endsWith('.anki2'))
        const dbFile = zipContent.file(dbFileName)

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

        // Step 4: Basic SQLite header validation
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

        // Step 5: Try to load with sql.js to ensure it's readable
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

        // All checks passed!
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
 * Gets basic information about the .apkg file contents
 * @param {JSZip} zipContent - The loaded ZIP content
 * @returns {Promise<object>} Basic file information
 */
export async function getApkgInfo(zipContent) {
    try {
        const files = Object.keys(zipContent.files)

        // Get media info
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

        // Count media files
        const mediaFiles = files.filter(f => 
            f !== 'collection.anki2' && 
            f !== 'media' && 
            !zipContent.files[f].dir
        )

        return {
            totalFiles: files.length,
            mediaFileCount: mediaFiles.length,
            mediaInfo: mediaInfo,
            allFiles: files
        }
    } catch (error) {
        console.error('Error getting .apkg info:', error)
        return {
            totalFiles: 0,
            mediaFileCount: 0,
            mediaInfo: {},
            allFiles: []
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
