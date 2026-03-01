import { getAudioContext } from './pointsSound'

// iOS Safari requires AudioContext.resume() during a trusted user gesture.
// HanziWriter captures touch events and its callbacks are async, so they don't
// qualify. This raw listener fires on the first tap to eagerly unlock audio.
export function initAudioUnlock() {
  const unlockAudio = () => {
    const ctx = getAudioContext()
    if (ctx.state === 'running') {
      document.removeEventListener('click', unlockAudio, true)
      return
    }
    ctx.resume().then(() => {
      if (ctx.state === 'running') {
        document.removeEventListener('click', unlockAudio, true)
      }
    })
  }

  document.addEventListener('click', unlockAudio, { capture: true })
}
