import { useState } from 'react'
import { db } from '../models/db'

type TestViewProps = {
  playPronunciation: (text: string, options?: { rate?: number }) => void
  voiceRate: number
  isSupported: boolean
}

export function TestView({ playPronunciation, voiceRate, isSupported }: TestViewProps) {
  const [customTts, setCustomTts] = useState('')

  const handlePlayback = () => {
    if (!customTts.trim()) return
    playPronunciation(customTts, { rate: voiceRate })
  }

  const handleClearSrs = async () => {
    await db.srsCards.clear()
  }

  return (
    <>
      <p className="tagline">Paste any Cantonese characters to hear the current TTS settings.</p>
      <section className="test-panel">
        <div className="custom-tts">
          <input
            type="text"
            className="custom-tts-input"
            placeholder="Type Cantonese text"
            value={customTts}
            onChange={(event) => setCustomTts(event.target.value)}
          />
          <button
            type="button"
            className="custom-tts-button"
            onClick={handlePlayback}
            disabled={!isSupported || customTts.trim().length === 0}
          >
            Play
          </button>
        </div>
        <button type="button" className="custom-tts-button" onClick={() => db.cloud.login?.()}>
          Login
        </button>
        <button type="button" className="custom-tts-button" onClick={handleClearSrs}>
          Clear SRS Records
        </button>
        {!isSupported && <p className="empty-hint">Speech synthesis is not supported in this browser.</p>}
      </section>
    </>
  )
}
