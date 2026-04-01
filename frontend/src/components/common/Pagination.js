import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
  siblingCount = 1,
  showFirstLast = true,
  className = '',
}) {
  if (totalPages <= 1) return null;

  const range = (start, end) => {
    const result = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  };

  const generatePages = () => {
    const totalNumbers = siblingCount * 2 + 3;
    if (totalPages <= totalNumbers + 2) return range(1, totalPages);

    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      const leftRange = range(1, 3 + 2 * siblingCount);
      return [...leftRange, '...', totalPages];
    }
    if (showLeftDots && !showRightDots) {
      const rightRange = range(totalPages - (2 + 2 * siblingCount), totalPages);
      return [1, '...', ...rightRange];
    }
    return [1, '...', ...range(leftSibling, rightSibling), '...', totalPages];
  };

  const pages = generatePages();

  const PageButton = ({ page, active = false, disabled = false, children, ariaLabel }) => (
    <button
      onClick={() => !disabled && page !== '...' && onPageChange(page)}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all
        ${active
          ? 'bg-green-700 text-white shadow-md shadow-green-200'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : page === '...'
              ? 'text-gray-400 cursor-default'
              : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
        }`}
    >
      {children || page}
    </button>
  );

  return (
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-1 ${className}`}>
      {showFirstLast && (
        <PageButton page={1} disabled={currentPage === 1} ariaLabel="First page">
          <FiChevronsLeft className="w-4 h-4" />
        </PageButton>
      )}
      <PageButton page={currentPage - 1} disabled={currentPage === 1} ariaLabel="Previous page">
        <FiChevronLeft className="w-4 h-4" />
      </PageButton>

      <div className="hidden sm:flex items-center gap-1">
        {pages.map((page, i) => (
          <PageButton key={`${page}-${i}`} page={page} active={page === currentPage} />
        ))}
      </div>

      <span className="sm:hidden text-sm text-gray-500 px-3">
        {currentPage} / {totalPages}
      </span>

      <PageButton page={currentPage + 1} disabled={currentPage === totalPages} ariaLabel="Next page">
        <FiChevronRight className="w-4 h-4" />
      </PageButton>
      {showFirstLast && (
        <PageButton page={totalPages} disabled={currentPage === totalPages} ariaLabel="Last page">
          <FiChevronsRight className="w-4 h-4" />
        </PageButton>
      )}
    </nav>
  );
}
