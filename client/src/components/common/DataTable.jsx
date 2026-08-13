import React from 'react';
import Card from './Card';
import Loader from './Loader';

const DataTable = ({
  columns,
  data,
  isLoading,
  emptyMessage = 'No records found',
  onRowClick,
}) => {
  if (isLoading) {
    return <Loader text="Loading data..." />;
  }

  if (!data || data.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-slate-400 text-sm font-medium">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="w-full overflow-x-auto lg:overflow-x-visible glass-panel rounded-2xl border border-slate-800">
      <table className="w-full text-left text-xs sm:text-sm text-slate-300">
        <thead className="bg-slate-900/80 text-[11px] sm:text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-3 py-3 font-semibold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors hover:bg-slate-800/40 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-3 py-3">
                  {col.cell ? col.cell(row) : row[col.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
