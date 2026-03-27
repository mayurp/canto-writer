import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'
import {
  DEFAULT_LIBRARY_CONFIG_KEY,
  defaultLibraryConfig,
  type LibraryConfig,
} from '../models/LibraryConfig'
import { parseCsv } from '../utils/csv'

export const useLibraryConfig = () => {
  const record = useLiveQuery(
    () => db.libraryConfig.get(DEFAULT_LIBRARY_CONFIG_KEY),
    [],
    null,
  )
  const config = record
    ? { ...defaultLibraryConfig, ...record }
    : defaultLibraryConfig

  const updateConfig = useCallback(
    <K extends keyof LibraryConfig>(key: K, value: LibraryConfig[K]) => {
      const next = { ...config, [key]: value }
      void db.libraryConfig
        .put({ ...next, id: DEFAULT_LIBRARY_CONFIG_KEY })
        .catch((error) => {
          console.error('Failed to save library config', error)
        })
    },
    [config],
  )

  const validateAndUpdateUrl = useCallback(
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`,
        )
      }
      const text = await response.text()
      parseCsv(text)
      updateConfig('vocabCsvUrl', url)
    },
    [updateConfig],
  )

  return { config, updateConfig, validateAndUpdateUrl }
}
