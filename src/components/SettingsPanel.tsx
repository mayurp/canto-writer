import { useSettings, ttsSpeedSteps } from '../hooks/useSettings'

const speedLabels = ttsSpeedSteps.map((value) => `${value}x`)

type SettingsPanelProps = {
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateSetting } = useSettings()
  const ttsSpeed = settings.ttsSpeed
  const orderMode = settings.orderMode
  const debug = settings.debug

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
              onChange={(event) => updateSetting('ttsSpeed', Number(event.target.value))}
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
                onChange={() => updateSetting('orderMode', 'opt')}
              />
              Optimized RTH
            </label>
            <label>
              <input
                type="radio"
                name="order-mode"
                value="rth"
                checked={orderMode === 'rth'}
                onChange={() => updateSetting('orderMode', 'rth')}
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
              onChange={(event) => updateSetting('debug', event.target.checked)}
            />
            Debug mode (show grading buttons)
          </label>
        </div>
      </div>
    </div>
  )
}
