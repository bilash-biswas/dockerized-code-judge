import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ total, page, limit, onPageChange }) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination-container animate-in">
      <div className="pagination-info">
        Showing <span>{(page - 1) * limit + 1}</span> to <span>{Math.min(page * limit, total)}</span> of <span>{total}</span> results
      </div>

      <div className="pagination-controls">
        <button
          className="pg-btn"
          disabled={page === 1}
          onClick={() => onPageChange(1)}
          title="First Page"
        >
          <ChevronsLeft size={18} />
        </button>
        <button
          className="pg-btn"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous Page"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="pg-numbers">
          {getPageNumbers().map(p => (
            <button
              key={p}
              className={`pg-num-btn ${page === p ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          className="pg-btn"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next Page"
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="pg-btn"
          disabled={page === totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
