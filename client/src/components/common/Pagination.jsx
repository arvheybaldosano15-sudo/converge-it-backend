import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage = 10, showCount = true }) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= itemsPerPage)) return null;

  const startItem = totalItems && totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  const handlePageClick = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === currentPage) return;
    onPageChange(pageNumber);

    // Smooth scroll to top of table/card container
    setTimeout(() => {
      const tableElem = document.querySelector('table') || document.querySelector('.glass-panel');
      if (tableElem) {
        const rect = tableElem.getBoundingClientRect();
        const offsetTop = window.pageYOffset + rect.top - 80;
        window.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });
      }
    }, 30);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 w-full">
      {showCount && totalItems > 0 ? (
        <p className="text-xs text-slate-400 transition-all duration-300">
          Showing <span className="font-semibold text-slate-200">{startItem}</span> to{' '}
          <span className="font-semibold text-slate-200">{endItem}</span> of{' '}
          <span className="font-semibold text-cyan-400">{totalItems}</span> results
        </p>
      ) : <div />}

      {totalPages > 1 && (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg glass-panel hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
            .map((page, idx, arr) => {
              const prev = arr[idx - 1];
              return (
                <React.Fragment key={page}>
                  {prev && page - prev > 1 && <span className="px-2 text-slate-500 text-xs select-none">...</span>}
                  <button
                    onClick={() => handlePageClick(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20 scale-105'
                        : 'glass-panel text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg glass-panel hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
