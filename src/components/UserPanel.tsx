import { useCloudUser } from '../hooks/useCloudUser'
import { useParentModeContext } from '../context/ParentModeContext'

type UserPanelProps = {
  open: boolean
  onClose: () => void
}

export function UserPanel({ open, onClose }: UserPanelProps) {
  const { user, login, logout } = useCloudUser()
  const { isUnlocked, unlockParentMode, lockParentMode, error, clearError } = useParentModeContext()

  if (!open) return null

  const isLoggedIn = Boolean(user?.isLoggedIn)

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-card">
        <div className="settings-header">
          <h2>Account</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Close user panel">
            ✕
          </button>
        </div>

        {isLoggedIn ? (
          <>
            <div className="settings-section">
              <p className="settings-label">Signed in as</p>
              <p className="user-email">{user?.email ?? 'Unknown email'}</p>
            </div>

            <div className="settings-section">
              <p className="user-warning">Warning: Logging out will remove all local data.</p>
            </div>
            <div className="settings-section user-actions">
              <button
                type="button"
                className="custom-tts-button"
                onClick={() => {
                  const confirmed = window.confirm('Are you sure you want to log out? This will remove all local data.')
                  if (confirmed) {
                    void logout()
                  }
                }}
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="settings-section">
              <p className="user-warning">Not logged in. Log in to sync your progress.</p>
            </div>
            <div className="settings-section user-actions">
              <button type="button" className="custom-tts-button" onClick={login}>
                Log in
              </button>
            </div>
          </>
        )}

        <div className="settings-section">
          <p className="settings-label">Parent mode</p>
          <p className={`parent-mode-status ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}>
            {isUnlocked ? 'Unlocked' : 'Locked'}
          </p>
          <div className="user-actions">
            {isUnlocked ? (
              <button type="button" className="custom-tts-button" onClick={lockParentMode}>
                Lock parent mode
              </button>
            ) : (
              <button
                type="button"
                className="custom-tts-button"
                onClick={() => {
                  const pin = window.prompt('Enter parent PIN')
                  if (pin) {
                    unlockParentMode(pin)
                  }
                }}
              >
                Unlock parent mode
              </button>
            )}
          </div>
          {error && (
            <p className="user-warning">
              {error}{' '}
              <button type="button" className="link-button" onClick={clearError}>
                Dismiss
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
