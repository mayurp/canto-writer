import './styles/PinModal.css'
import { Modal } from './Modal'
import { useEffect, useRef, useState } from 'react'
import { useParentModeContext } from '../context/ParentModeContext'

type PinModalProps = {
  open: boolean
  onClose: () => void
  title?: string
}

export function PinModal({
  open,
  onClose,
  title = 'Enter PIN',
}: PinModalProps) {
  const { unlockParentMode, error, clearError } = useParentModeContext()
  const [pin, setPin] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      clearError()
      // Delay to ensure modal is rendered and transition completes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 300)
    }
  }, [open, clearError])

  useEffect(() => {
    if (pin.length === 4) {
      unlockParentMode(pin)
    }
  }, [pin, unlockParentMode])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setPin('')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (/^\d*$/.test(val) && val.length <= 4) {
      setPin(val)
      if (error) {
        clearError()
      }
    }
  }

  const handleBoxClick = () => {
    inputRef.current?.focus()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="pin-modal-overlay"
    >
      <input
        ref={inputRef}
        type="tel" // Triggers simple number pad on mobile
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={handleChange}
        className="pin-hidden-input"
        autoComplete="off"
        autoFocus
      />

      <div
        className="pin-boxes is-focused"
        onClick={handleBoxClick}
        aria-hidden="true"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`pin-box ${i === pin.length ? 'is-active' : ''} ${error ? 'is-error' : ''}`}
          >
            {pin[i] ? '*' : ''}
          </div>
        ))}
      </div>
    </Modal>
  )
}
