import './styles/SortableHeader.css'

type SortableHeaderProps<T extends string> = {
    column: T
    label: string
    currentColumn: T
    direction: 'asc' | 'desc'
    onSort: (column: T) => void
}

export function SortableHeader<T extends string>({
    column,
    label,
    currentColumn,
    direction,
    onSort,
}: SortableHeaderProps<T>) {
    const isActive = currentColumn === column
    return (
        <th>
            <button type="button" className="sort-button" onClick={() => onSort(column)}>
                {label} <span className="sort-indicator">{isActive ? (direction === 'asc' ? '▲' : '▼') : ' '}</span>
            </button>
        </th>
    )
}
