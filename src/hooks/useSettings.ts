import { useCallback, useEffect, useState } from 'react'
import { db } from '../models/db'
import {
  DEFAULT_SETTINGS_KEY,
  defaultSettings,
  type OrderMode,
  type Settings,
  ttsSpeedSteps,
} from '../models/settings'

export { ttsSpeedSteps }
export type { OrderMode }

const loadSettings = async (): Promise<Settings> => {
  try {
    const stored = await db.settings.get(DEFAULT_SETTINGS_KEY)
    if (stored) {
      return { ...defaultSettings, ...stored }
    }
  } catch (error) {
    console.error('Failed to load settings', error)
  }
  return defaultSettings
}

const saveSettings = (settings: Settings) => {
  return db.settings.put({ ...settings, key: DEFAULT_SETTINGS_KEY }).catch((error) => {
    console.error('Failed to save settings', error)
  })
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    let cancelled = false
    loadSettings().then((loaded) => {
      if (!cancelled) {
        setSettings(loaded)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      void saveSettings(next)
      return next
    })
  }, [])

  return { settings, updateSetting }
}
