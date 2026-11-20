import React, { useState, useRef, useEffect } from 'react';
import { Building2, Check } from 'lucide-react';

interface MobileDepartmentPickerProps {
  selectedDept: string;
  deptOptions: string[];
  onSelectDept: (dept: string) => void;
  className?: string;
  align?: 'right' | 'left' | 'center';
}

export const MobileDepartmentPicker: React.FC<MobileDepartmentPickerProps> = ({
  selectedDept,
  deptOptions,
  onSelectDept,
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on tap outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  const isFiltered = selectedDept !== 'ALL';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer relative ${
          isFiltered
            ? 'app-primary-btn bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
            : 'app-subtle-surface bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
        }`}
        title={isFiltered ? `Filtered: ${selectedDept}` : 'Filter by Department'}
        aria-label="Filter by Department"
      >
        <Building2 className="w-3.5 h-3.5" />
        {isFiltered && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-current opacity-85" />
        )}
      </button>

      {/* Minimalist Department Dropdown Popover */}
      {/* Anchored cleanly below the button without clipping outside the mobile viewport edge */}
      {isOpen && (
        <div className={`app-surface-card text-zinc-900 dark:text-zinc-100 absolute ${
          align === 'left' 
            ? 'left-0' 
            : align === 'center' 
            ? 'left-1/2 -translate-x-1/2' 
            : 'right-0'
        } top-full mt-2 w-56 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150`}>
          <div className="px-2 py-1 flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800 pb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400">
              Department
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  onSelectDept('ALL');
                  setIsOpen(false);
                }}
                className="app-accent-text text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 pt-0.5 pr-0.5">
            {deptOptions.map((dept) => {
              const isSelected = selectedDept === dept;
              const displayLabel = dept === 'ALL' ? 'All Departments' : dept;

              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => {
                    onSelectDept(dept);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'app-active-tab font-bold shadow-2xs'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  <span className="truncate">{displayLabel}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
