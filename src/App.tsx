import { useState, type ReactNode } from 'react'
import './App.css'
import { LogoMark } from './components/LogoMark'
import { SettingsPanel } from './components/SettingsPanel'
import { UserPanel } from './components/UserPanel'
import { DeckManager } from './components/DeckManager'
import { PracticeView } from './components/PracticeView'
import { TestView } from './components/TestView'
import { SessionStatus } from './components/SessionStatus'
import { SchedulerProvider } from './context/SchedulerContext'
import { useRememberingDeck } from './hooks/useRememberingDeck'
import { useCantonesePronunciation } from './hooks/useCantonesePronunciation'
import { ttsSpeedSteps } from './hooks/useSettings'
import { SettingsProvider, useSettingsContext } from './context/SettingsContext'
import { useDeckSelection } from './hooks/useDeckSelection'
import { usePlayableDeck } from './hooks/usePlayableDeck'

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

function AppContent() {
  const { deck, loading, error } = useRememberingDeck()
  const { settings } = useSettingsContext()
  const { selectedIds, addCards, removeCard, clearAll } = useDeckSelection(deck)
  const { playableDeck } = usePlayableDeck(deck, selectedIds, settings.orderMode)
  const [view, setView] = useState<'learn' | 'manage' | 'test'>('learn')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userPanelOpen, setUserPanelOpen] = useState(false)
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
        <div className="header-actions">
          <button
            type="button"
            className="settings-trigger inline"
            onClick={() => setUserPanelOpen(true)}
            aria-label="Open user panel"
          >
            👤
          </button>
          <button
            type="button"
            className="settings-trigger inline"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            ⚙️
          </button>
        </div>
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
  } else if (playableDeck.length === 0) {
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
    <SchedulerProvider deck={playableDeck}>
      <main className="app-shell">
        <AppHeader rightSlot={headerRight} />
        {bodyContent}
      </main>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserPanel open={userPanelOpen} onClose={() => setUserPanelOpen(false)} />
    </SchedulerProvider>
  )
}

export default App
