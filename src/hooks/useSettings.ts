import { useCallback, useEffect, useState } from 'react'

export type OrderMode = 'opt' | 'rth'

type Settings = {
  ttsSpeed: number // index
  orderMode: OrderMode
  debug: boolean
}

const SETTINGS_KEY = 'canto-writer.settings'

const defaultSettings: Settings = {
  ttsSpeed: 2,
  orderMode: 'opt',
  debug: false,
}

export const ttsSpeedSteps = [0.65, 0.8, 0.95, 1.1, 1.25]

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') return defaultSettings
    try {
      const stored = window.localStorage.getItem(SETTINGS_KEY)
      if (!stored) return defaultSettings
      const parsed = JSON.parse(stored) as Partial<Settings>
      return {
        ttsSpeed: parsed.ttsSpeed ?? defaultSettings.ttsSpeed,
        orderMode: parsed.orderMode ?? defaultSettings.orderMode,
        debug: parsed.debug ?? defaultSettings.debug,
      }
    } catch {
      return defaultSettings
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  return { settings, updateSetting }
}
