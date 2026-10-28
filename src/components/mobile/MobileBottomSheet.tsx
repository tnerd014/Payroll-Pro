import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[85vh]',
  bodyClassName,
  footer,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const targetContainer = typeof document !== 'undefined'
    ? (document.getElementById('android-screen-viewport') || document.body)
    : null;

  if (!targetContainer) return null;

  const isFrame = targetContainer !== document.body;

  const content = (
    <div className={`${isFrame ? 'absolute' : 'fixed'} inset-0 z-50 flex flex-col justify-end`}>
      {/* Backdrop */}
      <div
        className={`${isFrame ? 'absolute' : 'fixed'} inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200`}
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div
        className={`relative z-10 w-full bg-white dark:bg-[#121215] border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col ${maxHeight} animate-in slide-in-from-bottom duration-250 ease-out`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android Drag Handle Pill with Close Button */}
        <div className="relative w-full flex items-center justify-center pt-3 pb-2 cursor-grab px-4 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-2.5 w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sheet Header (Rendered only when title or subtitle is present) */}
        {(title || subtitle) && (
          <div className="px-5 pb-3 pt-1 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
            <div>
              {title && (
                <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Sheet Scrollable Body */}
        <div className={`overflow-y-auto flex-1 min-h-0 ${bodyClassName !== undefined ? bodyClassName : 'p-5 space-y-4'}`}>
          {children}
        </div>

        {/* Sheet Pinned Footer (Thumb Zone) */}
        {footer && (
          <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-3.5 z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, targetContainer);
};
