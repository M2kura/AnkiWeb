let SQL = null
let loadingPromise = null

/**
 * Load sql.js using script tags (more reliable for some build systems)
 * @returns {Promise<boolean>} Success status
 */
export async function initializeSqlJs() {
    if (SQL) {
        return true // Already initialized
    }

    if (loadingPromise) {
        // If already loading, wait for that to complete
        return await loadingPromise
    }

    loadingPromise = new Promise(async (resolve) => {
        try {
            // Check if sql.js is already loaded globally
            if (window.initSqlJs) {
                SQL = await window.initSqlJs({
                    locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
                })
                console.log('SQL.js initialized from global')
                resolve(true)
                return
            }

            // Load sql.js script
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js'
            script.async = true

            script.onload = async () => {
                try {
                    SQL = await window.initSqlJs({
                        locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
                    })
                    console.log('SQL.js initialized successfully')
                    resolve(true)
                } catch (error) {
                    console.error('Failed to initialize SQL.js after loading script:', error)
                    resolve(false)
                }
            }

            script.onerror = () => {
                console.error('Failed to load SQL.js script')
                resolve(false)
            }

            document.head.appendChild(script)

        } catch (error) {
            console.error('Error setting up SQL.js loader:', error)
            resolve(false)
        }
    })

    return await loadingPromise
}

/**
 * Load a SQLite database from array buffer
 * @param {ArrayBuffer} buffer - The SQLite database file
 * @returns {Object|null} Database instance or null if failed
 */
export function loadDatabase(buffer) {
    if (!SQL) {
        throw new Error('SQL.js not initialized. Call initializeSqlJs() first.')
    }

    try {
        const uint8Array = new Uint8Array(buffer)
        const db = new SQL.Database(uint8Array)
        
        console.log('Database loaded successfully')
        return db
    } catch (error) {
        console.error('Failed to load database:', error)
        return null
    }
}

/**
 * Execute a SQL query on the database
 * @param {Object} db - Database instance
 * @param {string} query - SQL query to execute
 * @returns {Array} Query results
 */
export function executeQuery(db, query) {
    try {
        const stmt = db.prepare(query)
        const results = []
        
        while (stmt.step()) {
            const row = stmt.getAsObject()
            results.push(row)
        }
        
        stmt.free()
        return results
    } catch (error) {
        console.error('Query execution failed:', error)
        return []
    }
}

/**
 * Get database table names
 * @param {Object} db - Database instance
 * @returns {Array<string>} Table names
 */
export function getTableNames(db) {
    const query = "SELECT name FROM sqlite_master WHERE type='table'"
    const results = executeQuery(db, query)
    return results.map(row => row.name)
}

/**
 * Test if sql.js is working properly
 * @returns {Promise<boolean>} Test result
 */
export async function testSqlJs() {
    try {
        if (!SQL) {
            const initialized = await initializeSqlJs()
            if (!initialized) return false
        }

        // Create a test database
        const db = new SQL.Database()
        
        // Create a test table and insert data
        db.run("CREATE TABLE test (id INT, name TEXT)")
        db.run("INSERT INTO test VALUES (1, 'Hello'), (2, 'World')")
        
        // Query the data
        const results = executeQuery(db, "SELECT * FROM test")
        
        // Clean up
        db.close()
        
        console.log('SQL.js test results:', results)
        return results.length === 2
    } catch (error) {
        console.error('SQL.js test failed:', error)
        return false
    }
}
