import { useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

const SortableTable = ({ 
  columns, 
  data, 
  onSort, 
  defaultSort = { column: null, direction: 'asc' },
  className = ''
}) => {
  const [sortConfig, setSortConfig] = useState(defaultSort)

  const handleSort = (columnKey) => {
    let direction = 'asc'
    if (sortConfig.column === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    const newSortConfig = { column: columnKey, direction }
    setSortConfig(newSortConfig)
    
    if (onSort) {
      onSort(newSortConfig)
    }
  }

  const getSortIcon = (columnKey) => {
    if (sortConfig.column !== columnKey) {
      return <ArrowUp className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary-600" />
      : <ArrowDown className="h-3 w-3 text-primary-600" />
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ${
                  column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                }`}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-2 group">
                  <span>{column.label}</span>
                  {column.sortable !== false && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SortableTable

