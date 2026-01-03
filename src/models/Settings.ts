export type OrderMode = 'opt' | 'rth'

export interface Settings {
  ttsSpeed: number
  orderMode: OrderMode
  debug: boolean
}

export interface SettingsRecord extends Settings {
  key: string
}

export const DEFAULT_SETTINGS_KEY = 'user-settings'

export const defaultSettings: Settings = {
  ttsSpeed: 4,
  orderMode: 'rth',
  debug: false,
}

export const ttsSpeedSteps = [0.1, 0.3, 0.5, 0.7, 1.0]
