import './styles/UserPanel.css'
import { useCloudUser } from '../hooks/useCloudUser'
import { useParentModeContext } from '../context/ParentModeContext'
import { Modal } from './Modal'
import { useEffect, useState } from 'react'
import { PinModal } from './PinModal'

type UserPanelProps = {
  open: boolean
  onClose: () => void
}

export function UserPanel({ open, onClose }: UserPanelProps) {
  const { user, login, logout } = useCloudUser()
  const { isUnlocked, lockParentMode } = useParentModeContext()

  const [isEnteringPin, setIsEnteringPin] = useState(false)

  const isLoggedIn = Boolean(user?.isLoggedIn)

  useEffect(() => {
    if (!open) {
      setIsEnteringPin(false)
    }
  }, [open])

  useEffect(() => {
    if (isUnlocked) {
      setIsEnteringPin(false)
    }
  }, [isUnlocked])

  return (
    <>
      <Modal open={open} onClose={onClose} title="Account">
        {isLoggedIn ? (
          <>
            <div className="settings-section">
              <p className="settings-label">Signed in as</p>
              <p className="user-email">{user?.email ?? 'Unknown email'}</p>
            </div>

            <div className="settings-section">
              <p className="user-warning">
                Warning: Logging out will remove all local data.
              </p>
            </div>
            <div className="settings-section user-actions">
              <button
                type="button"
                className="pill-button"
                onClick={() => {
                  const confirmed = window.confirm(
                    'Are you sure you want to log out? This will remove all local data.',
                  )
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
              <p className="user-warning">
                Not logged in. Log in to sync your progress.
              </p>
            </div>
            <div className="settings-section user-actions">
              <button type="button" className="pill-button" onClick={login}>
                Log in
              </button>
            </div>
          </>
        )}

        <div className="settings-section">
          <p className="settings-label">Parent mode</p>
          <div className="user-actions">
            {isUnlocked ? (
              <button
                type="button"
                className="pill-button"
                onClick={lockParentMode}
              >
                Lock
              </button>
            ) : (
              <button
                type="button"
                className="pill-button"
                onClick={() => setIsEnteringPin(true)}
              >
                Unlock
              </button>
            )}
          </div>
        </div>
      </Modal>

      <PinModal open={isEnteringPin} onClose={() => setIsEnteringPin(false)} />
    </>
  )
}
