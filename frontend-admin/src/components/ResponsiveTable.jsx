/**
 * ResponsiveTable - A mobile-friendly table component
 * On mobile, it displays as cards. On desktop, it displays as a table.
 */
const ResponsiveTable = ({ columns, data, renderRow, renderMobileCard, emptyMessage = "No data available" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, idx) => (
                  <th
                  key={idx}
                  className={`px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, idx) => renderRow(item, idx))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((item, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow border border-gray-200 p-4">
            {renderMobileCard ? renderMobileCard(item, idx) : renderRow(item, idx)}
          </div>
        ))}
      </div>
    </>
  )
}

export default ResponsiveTable

