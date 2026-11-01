import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft,
  Printer, 
  Check, 
  Lock, 
  ZoomIn,
  Minimize2
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig,
  DEFAULT_PAYSLIP_DESIGN 
} from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';
import { CustomizablePayslipView } from '../payslip/CustomizablePayslipView';
import { PinchZoomContainer } from './PinchZoomContainer';
import { registerBackHandler } from '../../utils/mobileBackHandler';

interface MobilePayslipPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: CalculatedPayrollItem | null;
  monthLabel: string;
  year: number;
  company: CompanyProfile;
  isLocked?: boolean;
  payslipDesign?: PayslipDesignConfig;
}

export const MobilePayslipPreviewSheet: React.FC<MobilePayslipPreviewSheetProps> = ({
  isOpen,
  onClose,
  item,
  monthLabel,
  year,
  company,
  isLocked = false,
  payslipDesign,
}) => {
  const config = payslipDesign || DEFAULT_PAYSLIP_DESIGN;

  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const payslipContentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(380);
  const [payslipHeight, setPayslipHeight] = useState(850);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Intercept Android hardware back button
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  // ResizeObserver for available container width (giving full screen room)
  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current) return;
    const updateWidth = () => {
      if (canvasContainerRef.current) {
        setContainerWidth(canvasContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(canvasContainerRef.current);
    return () => ro.disconnect();
  }, [isOpen]);

  // ResizeObserver for payslip content height
  useEffect(() => {
    if (!isOpen || !payslipContentRef.current) return;
    const updateHeight = () => {
      if (payslipContentRef.current) {
        setPayslipHeight(payslipContentRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPayslipHeight(entry.contentRect.height);
      }
    });
    ro.observe(payslipContentRef.current);
    return () => ro.disconnect();
  }, [isOpen, item, config]);

  // Effective scale ensuring perfect fit with maximum readable resolution on phone width
  const effectiveScale = useMemo(() => {
    if (zoomMode === 'full') return 1.0;
    if (containerWidth > 0) {
      // 700px standard payslip document canvas
      return Math.min(1.0, Math.max(0.35, (containerWidth - 16) / 700));
    }
    return 0.52;
  }, [zoomMode, containerWidth]);

  if (!isOpen || !item) return null;

  // High-fidelity native print: print pure official document unscaled, supporting AndroidPrinter
  const handlePrint = () => {
    document.body.classList.add('print-portal-active');
    const androidPrinter = (window as any).AndroidPrinter;
    if (androidPrinter && typeof androidPrinter.print === 'function') {
      try {
        androidPrinter.print();
      } catch (err) {
        console.warn('AndroidPrinter invocation fallback to window.print:', err);
        window.print();
      }
    } else {
      window.print();
    }
    setTimeout(() => {
      document.body.classList.remove('print-portal-active');
    }, 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f4f5] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 overflow-hidden print-modal-root select-none animate-in fade-in duration-150">
      
      {/* ── 1. Top Full-Page Header Bar with Back Button (Full Screen Room) ── */}
      <header className="no-print shrink-0 h-14 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border-b border-zinc-200/90 dark:border-zinc-800/90 px-3 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors shrink-0 cursor-pointer active:scale-95"
            title="Back to Payroll Run"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5 truncate">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                {item.fullName}
              </h3>
              {isLocked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
              {item.employeeCode} &bull; {monthLabel} {year} &bull; {item.department || 'General'}
            </p>
          </div>
        </div>

        {/* Zoom Mode Toggle: Fit Screen vs 100% Full Document */}
        <button
          type="button"
          onClick={() => setZoomMode(z => z === 'fit' ? 'full' : 'fit')}
          className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs shrink-0 cursor-pointer active:scale-95 ml-2"
          title={zoomMode === 'fit' ? 'Zoom to 100% full scale' : 'Fit to screen width'}
        >
          {zoomMode === 'fit' ? (
            <>
              <ZoomIn className="w-3.5 h-3.5 text-zinc-500" />
              <span>100%</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Fit</span>
            </>
          )}
        </button>
      </header>

      {/* ── 2. Interactive Mobile Workspace with Hand Gesture Zoom (Pinch / Pan / Double-Tap) ── */}
      <main 
        className="no-print flex-1 min-h-0 w-full overflow-y-auto overscroll-y-contain p-2 sm:p-4 pb-24 flex flex-col items-center justify-start bg-zinc-100/90 dark:bg-[#0c0c0e]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <PinchZoomContainer
          zoomMode={zoomMode}
          onZoomModeChange={setZoomMode}
          className="my-2 w-full flex justify-center"
        >
          <CustomizablePayslipView
            item={item}
            company={company}
            monthLabel={monthLabel}
            year={year}
            config={config}
            interactive={false}
          />
        </PinchZoomContainer>
      </main>

      {/* ── 3. Dedicated Unscaled Official A4 Document for Clean Printing ── */}
      {/* Completely isolates the print spooler from screen preview scaling or frame artifacts */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0 print:bg-white">
        <CustomizablePayslipView
          item={item}
          company={company}
          monthLabel={monthLabel}
          year={year}
          config={config}
          interactive={false}
        />
      </div>

      {/* ── 4. Bottom Fixed Action Dock ── */}
      <footer className="no-print shrink-0 p-3.5 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 z-20">
        <div className="flex items-center justify-between gap-3 max-w-sm mx-auto w-full">
          {/* Primary Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            title="Print Official Payslip"
            aria-label="Print Official Payslip"
          >
            <Printer className="w-4 h-4" />
            <span>Print Payslip (A4)</span>
          </button>

          {/* Done / Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
            title="Close Preview"
            aria-label="Close Preview"
          >
            <Check className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>Done</span>
          </button>
        </div>
      </footer>

    </div>,
    document.body
  );
};
