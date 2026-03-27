import { DEFAULT_VOCAB_CSV_URL } from '../constants'

export interface LibraryConfig {
  vocabCsvUrl: string
}

export interface LibraryConfigRecord extends LibraryConfig {
  id: string
}

export const DEFAULT_LIBRARY_CONFIG_KEY = '#library-config'

export const defaultLibraryConfig: LibraryConfig = {
  vocabCsvUrl: DEFAULT_VOCAB_CSV_URL,
}
