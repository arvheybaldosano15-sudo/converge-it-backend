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
    <>
      {/* Desktop & Tablet View (Table) */}
      <div className="hidden md:block overflow-x-auto glass-panel rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 font-semibold">
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
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap">
                    {col.cell ? col.cell(row) : row[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View (Card List) */}
      <div className="md:hidden space-y-4">
        {data.map((row, rowIdx) => (
          <Card
            key={row.id || rowIdx}
            onClick={() => onRowClick && onRowClick(row)}
            className={`space-y-3 ${onRowClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
          >
            {columns.map((col, colIdx) => {
              // Highlight first column as header on mobile
              if (colIdx === 0) {
                return (
                  <div key={colIdx} className="border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">
                      {col.header}
                    </span>
                    <div className="text-base font-semibold text-white mt-0.5">
                      {col.cell ? col.cell(row) : row[col.accessorKey]}
                    </div>
                  </div>
                );
              }
              return (
                <div key={colIdx} className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">{col.header}:</span>
                  <div className="text-slate-200 font-medium">
                    {col.cell ? col.cell(row) : row[col.accessorKey]}
                  </div>
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </>
  );
};

export default DataTable;
