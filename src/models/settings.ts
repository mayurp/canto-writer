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
  ttsSpeed: 2,
  orderMode: 'opt',
  debug: false,
}

export const ttsSpeedSteps = [0.65, 0.8, 0.95, 1.1, 1.25]
