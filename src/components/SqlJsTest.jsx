import { useState } from 'react'
import { initializeSqlJs, testSqlJs } from '../utils/sqlScriptLoader'

export default function SqlJsTest() {
    const [testStatus, setTestStatus] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const runTest = async () => {
        setIsLoading(true)
        setTestStatus('Initializing SQL.js...')

        try {
            // Initialize sql.js
            const initialized = await initializeSqlJs()
            if (!initialized) {
                setTestStatus('❌ Failed to initialize SQL.js')
                setIsLoading(false)
                return
            }

            setTestStatus('Running SQL.js test...')

            // Run the test
            const testPassed = await testSqlJs()
            
            if (testPassed) {
                setTestStatus('✅ SQL.js is working correctly!')
            } else {
                setTestStatus('❌ SQL.js test failed')
            }
        } catch (error) {
            console.error('Test error:', error)
            setTestStatus(`❌ Error: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6 m-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">SQL.js Test</h2>
            
            <div className="space-y-4">
                <button
                    onClick={runTest}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isLoading 
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {isLoading ? 'Testing...' : 'Test SQL.js'}
                </button>

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
            </div>

            <div className="mt-6 text-sm text-gray-600">
                <p><strong>What this test does:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Initializes the SQL.js WebAssembly library</li>
                    <li>Creates a temporary SQLite database in memory</li>
                    <li>Creates a test table and inserts sample data</li>
                    <li>Queries the data to verify everything works</li>
                </ul>
            </div>
        </div>
    )
}
