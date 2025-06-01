import { useState, useEffect } from 'react'

export default function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [showMessage, setShowMessage] = useState(false)

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            setShowMessage(true)
            setTimeout(() => setShowMessage(false), 3000)
        }

        const handleOffline = () => {
            setIsOnline(false)
            setShowMessage(true)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    if (!showMessage && isOnline) return null

    return (
        <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg transition-all duration-300 ${
            isOnline 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">
                    {isOnline ? 'Back online' : 'You are offline'}
                </span>
            </div>
        </div>
    )
} 