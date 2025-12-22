import type { OrderMode } from '../hooks/useSettings'

type SettingsPanelProps = {
  open: boolean
  onClose: () => void
  ttsSpeed: number
  onTtsSpeedChange: (index: number) => void
  orderMode: OrderMode
  onOrderModeChange: (mode: OrderMode) => void
  debug: boolean
  onDebugChange: (value: boolean) => void
}

const speedLabels = ['0.65x', '0.8x', '0.95x', '1.1x', '1.25x']

export function SettingsPanel({
  open,
  onClose,
  ttsSpeed,
  onTtsSpeedChange,
  orderMode,
  onOrderModeChange,
  debug,
  onDebugChange,
}: SettingsPanelProps) {
  if (!open) return null

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-card">
        <div className="settings-header">
          <h2>Settings</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings-section">
          <p className="settings-label">Text-to-speech speed</p>
          <div className="speed-slider">
            <input
              type="range"
              min={0}
              max={speedLabels.length - 1}
              step={1}
              value={ttsSpeed}
              onChange={(event) => onTtsSpeedChange(Number(event.target.value))}
            />
            <div className="speed-label">{speedLabels[ttsSpeed]}</div>
          </div>
        </div>

        <div className="settings-section">
          <p className="settings-label">Initial deck order</p>
          <div className="order-choice">
            <label>
              <input
                type="radio"
                name="order-mode"
                value="opt"
                checked={orderMode === 'opt'}
                onChange={() => onOrderModeChange('opt')}
              />
              Optimized RTH
            </label>
            <label>
              <input
                type="radio"
                name="order-mode"
                value="rth"
                checked={orderMode === 'rth'}
                onChange={() => onOrderModeChange('rth')}
              />
              Original RTH
            </label>
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={debug}
              onChange={(event) => onDebugChange(event.target.checked)}
            />
            Debug mode (show grading buttons)
          </label>
        </div>
      </div>
    </div>
  )
}
