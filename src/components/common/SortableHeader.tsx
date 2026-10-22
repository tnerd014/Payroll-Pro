import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  label: React.ReactNode;
  field: string;
  currentSortField: string | null;
  sortDirection: SortDirection;
  onSort: (field: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  field,
  currentSortField,
  sortDirection,
  onSort,
  align = 'left',
  className = '',
}) => {
  const isActive = currentSortField === field;

  const alignClasses = {
    left: 'justify-start text-left',
    center: 'justify-center text-center mx-auto',
    right: 'justify-end text-right ml-auto',
  }[align];

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`group inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[10px] transition-colors focus:outline-none select-none cursor-pointer ${alignClasses} ${
        isActive
          ? 'text-zinc-900 dark:text-zinc-100 font-bold'
          : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
      } ${className}`}
      title={`Sort by ${typeof label === 'string' ? label : field}`}
    >
      <span>{label}</span>
      <span className="shrink-0">
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-zinc-900 dark:text-zinc-100 stroke-[2.2]" />
          ) : (
            <ArrowDown className="w-3 h-3 text-zinc-900 dark:text-zinc-100 stroke-[2.2]" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-zinc-400/50 dark:text-zinc-500/50 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 stroke-[1.8] transition-colors" />
        )}
      </span>
    </button>
  );
};
