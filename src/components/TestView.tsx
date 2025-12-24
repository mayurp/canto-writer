import { LogoMark } from './LogoMark'
import { db } from '../models/db'

type TestViewProps = {
  customTts: string
  onCustomTtsChange: (value: string) => void
  onPlay: () => void
  isSupported: boolean
  NavTabs: () => JSX.Element
}

export function TestView({ customTts, onCustomTtsChange, onPlay, isSupported, NavTabs }: TestViewProps) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark">
          <LogoMark size={20} />
          <div>
            <p className="eyebrow">Canto Writer</p>
          </div>
        </div>
        <NavTabs />
        <p className="tagline">Paste any Cantonese characters to hear the current TTS settings.</p>
      </header>

      <section className="test-panel">
        <div className="custom-tts">
          <input
            type="text"
            className="custom-tts-input"
            placeholder="Type Cantonese text"
            value={customTts}
            onChange={(event) => onCustomTtsChange(event.target.value)}
          />
          <button
            type="button"
            className="custom-tts-button"
            onClick={onPlay}
            disabled={!isSupported || customTts.trim().length === 0}
          >
            Play
          </button>
        </div>
        <button type="button" className="custom-tts-button" onClick={() => db.cloud.login?.()}>
          Login
        </button>
        {!isSupported && <p className="empty-hint">Speech synthesis is not supported in this browser.</p>}
      </section>
    </main>
  )
}
