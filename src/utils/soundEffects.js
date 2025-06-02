// Sound effect utility functions
const sounds = {
    flip: new Audio('/AnkiWeb/sounds/card-flip.mp3')
}

// Preload sounds
Object.values(sounds).forEach(sound => {
    sound.load()
})

let isMuted = false

export const playSound = (soundName) => {
    if (isMuted) return

    const sound = sounds[soundName]
    if (sound) {
        // Reset the sound to start
        sound.currentTime = 0
        // Play the sound
        sound.play().catch(error => {
            console.warn('Error playing sound:', error)
        })
    }
}

export const toggleMute = () => {
    isMuted = !isMuted
    return isMuted
}

export const isSoundMuted = () => isMuted 