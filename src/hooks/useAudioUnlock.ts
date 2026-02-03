import { useEffect, useRef } from 'react'
import { initAudio } from '../utils/pointsSound'

/**
 * Hook to unlock audio (AudioContext) on the first user interaction.
 * This is required for iOS/Safari where autoplay policies block audio until a
 * user gesture.
 */
export const useAudioUnlock = () => {
  const unlockedRef = useRef(false)

  useEffect(() => {
    const handleUnlock = () => {
      if (unlockedRef.current) return

      // Unlock Web Audio API
      initAudio()

      unlockedRef.current = true
      removeListeners()
    }

    const events = ['touchstart', 'click', 'keydown'] as const
    // We listen for common interaction events to trigger the unlock as early as
    // possible.
    // 'capture: true' is used to catch the event before it might be stopped by
    // other handlers.
    const options = { capture: true }

    const addListeners = () => {
      // Add listeners to window to ensure we catch any interaction
      events.forEach((event) => {
        window.addEventListener(event, handleUnlock, options)
      })
    }

    const removeListeners = () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUnlock, options)
      })
    }

    addListeners()
    return removeListeners
  }, [])
}
