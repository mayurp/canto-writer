import { useMemo, useState } from 'react'
import './App.css'
import { LogoMark } from './components/LogoMark'
import { SettingsPanel } from './components/SettingsPanel'
import { DeckManager } from './components/DeckManager'
import { PracticeView } from './components/PracticeView'
import { TestView } from './components/TestView'
import { useScheduler } from './hooks/useScheduler'
import { useRememberingDeck } from './hooks/useRememberingDeck'
import { useCantonesePronunciation } from './hooks/useCantonesePronunciation'
import { useSettings, ttsSpeedSteps } from './hooks/useSettings'
import { useDeckSelection } from './hooks/useDeckSelection'
import { useVocabExamples } from './hooks/useVocabExamples'

function App() {
  const { deck, loading, error } = useRememberingDeck()
  const { examples } = useVocabExamples()
  const { settings } = useSettings()
  const orderedDeck = useMemo(() => {
    if (!deck.length) return deck
    if (settings.orderMode === 'rth') {
      return [...deck].sort((a, b) => {
        const aOrder = a.rthOrder ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.rthOrder ?? Number.MAX_SAFE_INTEGER
        return aOrder - bOrder
      })
    }
    return [...deck].sort((a, b) => a.order - b.order)
  }, [deck, settings.orderMode])
  const { selectedIds, addCards, removeCard, clearAll } = useDeckSelection(deck)
  const playableDeck = useMemo(() => {
    if (!selectedIds.length) return []
    const allowed = new Set(selectedIds)
    return orderedDeck.filter((card) => allowed.has(card.id))
  }, [orderedDeck, selectedIds])
  const [view, setView] = useState<'learn' | 'manage' | 'test'>('learn')
  const { currentCard, dueCount, totalCount, reviewCard, shouldShowOutline, setOutlineLearned } =
    useScheduler(playableDeck)
  const [customTts, setCustomTts] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { playPronunciation, speaking, isSupported } = useCantonesePronunciation()
  const voiceRate = ttsSpeedSteps[settings.ttsSpeed] ?? ttsSpeedSteps[2]

  const navClass = (target: 'learn' | 'manage' | 'test') => `nav-tab${view === target ? ' is-active' : ''}`

  const handleCustomPlayback = () => {
    if (!customTts.trim()) return
    playPronunciation(customTts, { rate: voiceRate })
  }

  const SettingsButton = ({ inline = false }: { inline?: boolean }) => (
    <button
      type="button"
      className={`settings-trigger${inline ? ' inline' : ''}`}
      onClick={() => setSettingsOpen(true)}
      aria-label="Open settings"
    >
      ⚙️
    </button>
  )

  const NavTabs = () => (
    <div className="nav-tabs">
      <button type="button" className={navClass('learn')} onClick={() => setView('learn')}>
        Learn
      </button>
      <button type="button" className={navClass('manage')} onClick={() => setView('manage')}>
        Build deck
      </button>
      <button type="button" className={navClass('test')} onClick={() => setView('test')}>
        Test
      </button>
    </div>
  )

  let pageContent: JSX.Element

  if (loading) {
    pageContent = (
      <main className="app-shell">
        <div className="empty-state">
          <p>Loading characters…</p>
        </div>
      </main>
    )
  } else if (error) {
    pageContent = (
      <main className="app-shell">
        <div className="empty-state">
          <p>Failed to load deck.</p>
          <p className="error-detail">{error}</p>
        </div>
      </main>
    )
  } else if (view === 'manage') {
    pageContent = (
      <>
        <SettingsButton />
        <main className="app-shell">
          <header className="app-header">
            <div className="brand-mark">
              <LogoMark size={20} />
              <p className="eyebrow">Canto Writer</p>
            </div>
            <NavTabs />
          </header>
          <DeckManager
            deck={deck}
            selectedIds={selectedIds}
            addCards={addCards}
            removeCard={removeCard}
            clearAll={clearAll}
            onBack={() => setView('learn')}
            orderMode={settings.orderMode}
          />
        </main>
      </>
    )
  } else if (view === 'test') {
    pageContent = (
      <>
        <SettingsButton />
        <TestView
          customTts={customTts}
          onCustomTtsChange={setCustomTts}
          onPlay={handleCustomPlayback}
          isSupported={isSupported}
          NavTabs={NavTabs}
        />
      </>
    )
  } else if (!currentCard || playableDeck.length === 0) {
    pageContent = (
      <>
        <SettingsButton />
        <main className="app-shell">
          <header className="app-header">
            <div className="brand-mark">
              <LogoMark size={20} />
              <div>
                <p className="eyebrow">Canto Writer</p>
              </div>
            </div>
            <NavTabs />
          </header>
          <div className="empty-state">
            <p>Your study deck is empty. Add characters from the RTH list to begin.</p>
            <button type="button" className="clear-link" onClick={() => setView('manage')}>
              Open deck builder
            </button>
          </div>
        </main>
      </>
    )
  } else {
    pageContent = (
      <PracticeView
        currentCard={currentCard!}
        dueCount={dueCount}
        totalCount={totalCount}
        reviewCard={reviewCard}
        shouldShowOutline={shouldShowOutline}
        setOutlineLearned={setOutlineLearned}
        settings={settings}
        examples={examples}
        playPronunciation={playPronunciation}
        speaking={speaking}
        isSupported={isSupported}
        voiceRate={voiceRate}
        NavTabs={NavTabs}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    )
  }

  return (
    <>
      {pageContent}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default App
