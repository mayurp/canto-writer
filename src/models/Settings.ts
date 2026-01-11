export type OrderMode = 'opt' | 'rth'

export interface Settings {
  ttsSpeed: number
  orderMode: OrderMode
  debug: boolean
}

export interface SettingsRecord extends Settings {
  id: string
}

export const DEFAULT_SETTINGS_KEY = '#settings'

export const defaultSettings: Settings = {
  ttsSpeed: 0.3,
  orderMode: 'rth',
  debug: false,
}

export const ttsSpeedSteps = [0.1, 0.3, 0.5, 0.7, 1.0]
