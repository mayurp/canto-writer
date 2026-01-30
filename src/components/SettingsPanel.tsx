import './styles/SettingsPanel.css'
import { useSettingsContext } from '../context/SettingsContext'
import { ttsSpeedSteps } from '../hooks/useSettings'
import { Modal } from './Modal'

const speedLabels = ttsSpeedSteps.map((value) => `${value}x`)

type SettingsPanelProps = {
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateSetting } = useSettingsContext()

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="settings-section">
        <p className="settings-label">Text-to-speech speed</p>
        <div className="speed-slider">
          <input
            type="range"
            min={0}
            max={speedLabels.length - 1}
            step={1}
            value={settings.ttsSpeed}
            onChange={(event) => updateSetting('ttsSpeed', Number(event.target.value))}
          />
          <div className="speed-label">{speedLabels[settings.ttsSpeed]}</div>
        </div>
      </div>

      <div className="settings-section">
        <p className="settings-label">Initial deck order</p>
        <div className="order-choice">
          {([
            { label: 'Original RTH', value: 'rth' },
            { label: 'Optimized RTH', value: 'opt' },
          ] as const).map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="order-mode"
                value={option.value}
                checked={settings.orderMode === option.value}
                onChange={() => updateSetting('orderMode', option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {import.meta.env.DEV && (
        <div className="settings-section">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.debug}
              onChange={(event) => updateSetting('debug', event.target.checked)}
            />
            Debug mode (show grading buttons)
          </label>
        </div>
      )}

      <div className="settings-version">
        <p>Version: {__APP_VERSION__}</p>
        <p>Built: {new Date(__BUILD_TIMESTAMP__).toLocaleString()}</p>
      </div>
    </Modal>
  )
}
