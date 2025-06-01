import JSZip from 'jszip'

/**
 * Validates if a file is a proper .apkg (Anki package) file
 * @param {File} file - The file to validate
 * @returns {Promise<{isValid: boolean, error?: string, zipContent?: JSZip}>}
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

        // Step 3: Validate the database file is not empty
        const dbFile = zipContent.file('collection.anki2') || 
                      zipContent.file(foundFiles.find(f => f.endsWith('.anki2')))

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

        // All checks passed!
        return {
            isValid: true,
            zipContent: zipContent,
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
