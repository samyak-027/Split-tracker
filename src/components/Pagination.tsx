import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-base-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-base-content/60">
        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-sm btn-ghost gap-1"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="text-sm font-medium tabular-nums">{currentPage} / {totalPages}</span>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-sm btn-ghost gap-1"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
