import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'
import {
  DEFAULT_SETTINGS_KEY,
  defaultSettings,
  type OrderMode,
  type Settings,
  ttsSpeedSteps,
} from '../models/Settings'

export { ttsSpeedSteps }
export type { OrderMode }

export const useSettings = () => {
  const record = useLiveQuery(
    () => db.settings.get(DEFAULT_SETTINGS_KEY),
    [],
    null,
  )
  const settings = record ? { ...defaultSettings, ...record } : defaultSettings

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...settings, [key]: value }
    void db.settings.put({ ...next, id: DEFAULT_SETTINGS_KEY }).catch((error) => {
      console.error('Failed to save settings', error)
    })
  }, [settings])

  return { settings, updateSetting }
}
