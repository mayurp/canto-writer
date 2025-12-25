import { useMemo, useState, type ReactNode } from 'react'
import './App.css'
import { LogoMark } from './components/LogoMark'
import { SettingsPanel } from './components/SettingsPanel'
import { DeckManager } from './components/DeckManager'
import { PracticeView } from './components/PracticeView'
import { TestView } from './components/TestView'
import { SessionStatus } from './components/SessionStatus'
import { SchedulerContext } from './context/SchedulerContext'
import { useScheduler } from './hooks/useScheduler'
import { useRememberingDeck } from './hooks/useRememberingDeck'
import { useCantonesePronunciation } from './hooks/useCantonesePronunciation'
import { useSettings, ttsSpeedSteps } from './hooks/useSettings'
import { useDeckSelection } from './hooks/useDeckSelection'

function App() {
  const { deck, loading, error } = useRememberingDeck()
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
  const scheduler = useScheduler(playableDeck)
  const { currentCard } = scheduler
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { playPronunciation, speaking, isSupported } = useCantonesePronunciation()
  const voiceRate = ttsSpeedSteps[settings.ttsSpeed] ?? ttsSpeedSteps[2]

  const navClass = (target: 'learn' | 'manage' | 'test') => `nav-tab${view === target ? ' is-active' : ''}`

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

  const AppHeader = ({ rightSlot }: { rightSlot?: ReactNode }) => (
    <header className="app-header">
      <div className="header-row">
        <div className="brand-mark">
          <LogoMark size={20} />
          <p className="eyebrow">Canto Writer</p>
        </div>
        <button
          type="button"
          className="settings-trigger inline"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ⚙️
        </button>
      </div>
      <div className="nav-row">
        <NavTabs />
        {rightSlot ?? <span />}
      </div>
    </header>
  )

  let headerRight: ReactNode | null = null
  let bodyContent: ReactNode

  if (loading) {
    bodyContent = (
      <div className="empty-state">
        <p>Loading characters…</p>
      </div>
    )
  } else if (error) {
    bodyContent = (
      <div className="empty-state">
        <p>Failed to load deck.</p>
        <p className="error-detail">{error}</p>
      </div>
    )
  } else if (view === 'manage') {
    bodyContent = (
      <DeckManager
        deck={deck}
        selectedIds={selectedIds}
        addCards={addCards}
        removeCard={removeCard}
        clearAll={clearAll}
      />
    )
  } else if (view === 'test') {
    bodyContent = (
      <TestView
        playPronunciation={playPronunciation}
        voiceRate={voiceRate}
        isSupported={isSupported}
      />
    )
  } else if (!currentCard || playableDeck.length === 0) {
    bodyContent = (
      <div className="empty-state">
        <p>Your study deck is empty. Add characters from the RTH list to begin.</p>
        <button type="button" className="clear-link" onClick={() => setView('manage')}>
          Open deck builder
        </button>
      </div>
    )
  } else {
    headerRight = <SessionStatus />
    bodyContent = (
      <PracticeView
        playPronunciation={playPronunciation}
        speaking={speaking}
        isSupported={isSupported}
        voiceRate={voiceRate}
      />
    )
  }

  return (
    <SchedulerContext.Provider value={scheduler}>
      <main className="app-shell">
        <AppHeader rightSlot={headerRight} />
        {bodyContent}
      </main>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SchedulerContext.Provider>
  )
}

export default App
