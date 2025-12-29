import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Settings } from '../models/Settings'
import { useSettings } from '../hooks/useSettings'

export type SettingsValue = {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const SettingsContext = createContext<SettingsValue | null>(null)

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const value = useSettings()
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettingsContext = () => {
  const value = useContext(SettingsContext)
  if (!value) {
    throw new Error('useSettingsContext must be used within SettingsProvider')
  }
  return value
}
