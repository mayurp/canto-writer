import Papa from 'papaparse'

type CsvRow = Record<string, string>

export const parseCsv = (text: string): CsvRow[] => {
  const { data, errors } = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (value: string) => value.trim(),
  })

  if (errors.length > 0) {
    const firstError = errors[0]
    throw new Error(`CSV parse error${typeof firstError.row === 'number' ? ` at row ${firstError.row}` : ''}: ${firstError.message}`)
  }

  return data
}
