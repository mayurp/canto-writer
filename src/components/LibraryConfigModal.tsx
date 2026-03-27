import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { useLibraryConfig } from '../hooks/useLibraryConfig'
import { defaultLibraryConfig } from '../models/LibraryConfig'

type LibraryConfigModalProps = {
  open: boolean
  onClose: () => void
}

export function LibraryConfigModal({ open, onClose }: LibraryConfigModalProps) {
  const { config, validateAndUpdateUrl } = useLibraryConfig()
  const [draftUrl, setDraftUrl] = useState(config.vocabCsvUrl ?? '')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (open) {
      setDraftUrl(config.vocabCsvUrl ?? '')
      setValidationError('')
    }
  }, [open, config.vocabCsvUrl])

  const handleApply = async () => {
    setIsValidating(true)
    setValidationError('')
    try {
      await validateAndUpdateUrl(draftUrl)
      onClose()
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : 'Validation failed')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Vocabulary Data Source">
      <div className="settings-section">
        <p className="settings-label">Google Sheet CSV URL</p>
        <input
          type="url"
          className="settings-input library-url-input"
          value={draftUrl}
          onChange={(event) => setDraftUrl(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/..."
        />
        {validationError && (
          <p className="library-validation-error">{validationError}</p>
        )}
        <div className="library-config-actions">
          <button
            type="button"
            className="library-config-apply"
            onClick={handleApply}
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : 'Apply URL'}
          </button>
          <button
            type="button"
            className="clear-link"
            onClick={() => {
              setDraftUrl(defaultLibraryConfig.vocabCsvUrl)
              setValidationError('')
            }}
          >
            Reset to default
          </button>
        </div>
      </div>
    </Modal>
  )
}
