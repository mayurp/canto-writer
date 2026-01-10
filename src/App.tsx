import { useEffect, useState, type ReactNode } from 'react'
import './App.css'
import { LogoMark } from './components/LogoMark'
import { SettingsPanel } from './components/SettingsPanel'
import { UserPanel } from './components/UserPanel'
import { DeckView } from './components/DeckView'
import { LibraryView } from './components/LibraryView'
import { PracticeView } from './components/PracticeView'
import { TestView } from './components/TestView'
import { SessionStatus } from './components/SessionStatus'
import { SchedulerProvider } from './context/SchedulerContext'
import { useRememberingDeck } from './hooks/useRememberingDeck'
import { useCantonesePronunciation } from './hooks/useCantonesePronunciation'
import { ttsSpeedSteps } from './hooks/useSettings'
import { SettingsProvider, useSettingsContext } from './context/SettingsContext'
import { ParentModeProvider, useParentModeContext } from './context/ParentModeContext'
import { useDeckSelection } from './hooks/useDeckSelection'
import { usePlayableDeck } from './hooks/usePlayableDeck'

function App() {
  return (
    <SettingsProvider>
      <ParentModeProvider>
        <AppContent />
      </ParentModeProvider>
    </SettingsProvider>
  )
}

type AppView = 'learn' | 'deck' | 'library' | 'test'

function AppContent() {
  const { deck, loading, error } = useRememberingDeck()
  const { settings } = useSettingsContext()
  const { selectedIds, addCards, removeCard } = useDeckSelection(deck)
  const { playableDeck } = usePlayableDeck(deck, selectedIds, settings.orderMode)
  const debugEnabled = import.meta.env.DEV && settings.debug
  const [view, setView] = useState<AppView>('learn')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userPanelOpen, setUserPanelOpen] = useState(false)
  const { playPronunciation, speaking, isSupported } = useCantonesePronunciation()
  const { isUnlocked: parentModeUnlocked } = useParentModeContext()
  const voiceRate = ttsSpeedSteps[settings.ttsSpeed] ?? ttsSpeedSteps[2]

  const navClass = (target: AppView, disabled = false) =>
    `nav-tab${view === target ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`

  const NavTabs = () => (
    <div className="nav-tabs">
      <button type="button" className={navClass('learn')} onClick={() => setView('learn')}>
        Learn
      </button>
      <button type="button" className={navClass('deck')} onClick={() => setView('deck')}>
        Deck
      </button>
      {parentModeUnlocked && (
        <button type="button" className={navClass('library')} onClick={() => setView('library')}>
          Library
        </button>
      )}
      {debugEnabled && (
        <button type="button" className={navClass('test')} onClick={() => setView('test')}>
          Test
        </button>
      )}
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

  useEffect(() => {
    if (view === 'test' && !debugEnabled) {
      setView('learn')
    }
  }, [debugEnabled, view])

  useEffect(() => {
    if (!parentModeUnlocked && view === 'library') {
      setView('deck')
    }
  }, [parentModeUnlocked, view])

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
  } else if (view === 'deck') {
    bodyContent = (
      <DeckView
        selectedIds={selectedIds}
        playPronunciation={(text) => playPronunciation(text, { rate: voiceRate })}
        isSpeechSupported={isSupported}
      />
    )
  } else if (view === 'library') {
    bodyContent = (
      <LibraryView
        deck={deck}
        selectedIds={selectedIds}
        addCards={addCards}
        removeCard={removeCard}
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
        <p>Your study deck is empty. Add characters from the Library to begin.</p>
        {parentModeUnlocked ? (
          <button type="button" className="clear-link" onClick={() => setView('library')}>
            Open library
          </button>
        ) : (
          <p className="parent-mode-hint">Unlock parent mode to add more cards.</p>
        )}
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
