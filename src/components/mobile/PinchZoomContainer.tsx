import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PinchZoomContainerProps {
  children: React.ReactNode;
  contentWidth?: number; // standard document canvas width, default 700
  className?: string;
  zoomMode?: 'fit' | 'full';
  onZoomModeChange?: (mode: 'fit' | 'full') => void;
  showFloatingControls?: boolean;
}

export const PinchZoomContainer: React.FC<PinchZoomContainerProps> = ({
  children,
  contentWidth = 700,
  className = '',
  zoomMode = 'fit',
  onZoomModeChange,
  showFloatingControls = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Measured width of the available screen viewport
  const [viewportWidth, setViewportWidth] = useState<number>(380);

  // Measure container width on mount and resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setViewportWidth(w);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Base scale to fit screen exactly with 12px horizontal padding
  const baseFitScale = useMemo(() => {
    if (viewportWidth > 0) {
      return Math.min(1.0, Math.max(0.35, (viewportWidth - 16) / contentWidth));
    }
    return 0.5;
  }, [viewportWidth, contentWidth]);

  // Current user zoom multiplier (1.0 = baseFitScale)
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const badgeTimerRef = useRef<any>(null);

  // Synchronize with external zoomMode prop
  useEffect(() => {
    if (zoomMode === 'full') {
      setZoomFactor(1.0 / baseFitScale);
      setPan({ x: 0, y: 0 });
    } else if (zoomMode === 'fit') {
      setZoomFactor(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [zoomMode, baseFitScale]);

  // Show zoom indicator toast momentarily
  const triggerBadge = useCallback(() => {
    setShowBadge(true);
    if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = setTimeout(() => {
      setShowBadge(false);
    }, 1200);
  }, []);

  // Gesture tracking refs (avoids React render cycle overhead on raw touch events)
  const gestureRef = useRef<{
    initialDist: number;
    initialZoom: number;
    startPan: { x: number; y: number };
    startTouchX: number;
    startTouchY: number;
    isPinching: boolean;
    isPanning: boolean;
    lastTapTime: number;
    rafId: number | null;
  }>({
    initialDist: 0,
    initialZoom: 1,
    startPan: { x: 0, y: 0 },
    startTouchX: 0,
    startTouchY: 0,
    isPinching: false,
    isPanning: false,
    lastTapTime: 0,
    rafId: null,
  });

  // Calculate distance between two touches
  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Max pan calculation
  const getMaxPan = useCallback((scale: number) => {
    const renderedW = contentWidth * scale;
    const maxPanX = Math.max(0, (renderedW - viewportWidth) / 2 + 40);
    const maxPanY = Math.max(0, renderedW * 0.7);
    return { maxPanX, maxPanY };
  }, [contentWidth, viewportWidth]);

  // Touch Start
  const handleTouchStart = (e: React.TouchEvent) => {
    const g = gestureRef.current;

    if (e.touches.length === 2) {
      // 2-finger pinch gesture start
      e.preventDefault();
      setIsInteracting(true);
      g.initialDist = getDistance(e.touches[0], e.touches[1]);
      g.initialZoom = zoomFactor;
      g.startPan = { ...pan };
      g.isPinching = true;
      g.isPanning = false;
      triggerBadge();
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const timeSinceLastTap = now - g.lastTapTime;

      // Double-Tap to Zoom / Reset
      if (timeSinceLastTap > 0 && timeSinceLastTap < 300) {
        e.preventDefault();
        setIsInteracting(false);
        if (zoomFactor > 1.25) {
          // Reset to fit
          setZoomFactor(1.0);
          setPan({ x: 0, y: 0 });
          if (onZoomModeChange) onZoomModeChange('fit');
        } else {
          // Smooth zoom to 2.2x
          setZoomFactor(2.2);
          setPan({ x: 0, y: 0 });
          if (onZoomModeChange) onZoomModeChange('full');
        }
        triggerBadge();
        g.lastTapTime = 0;
        return;
      }
      g.lastTapTime = now;

      // 1-finger pan if zoomed in
      if (zoomFactor > 1.05) {
        setIsInteracting(true);
        g.isPanning = true;
        g.isPinching = false;
        g.startTouchX = e.touches[0].clientX;
        g.startTouchY = e.touches[0].clientY;
        g.startPan = { ...pan };
      }
    }
  };

  // Touch Move (60fps requestAnimationFrame batched)
  const handleTouchMove = (e: React.TouchEvent) => {
    const g = gestureRef.current;

    if (e.touches.length === 2 && g.isPinching) {
      e.preventDefault();
      const currentDist = getDistance(e.touches[0], e.touches[1]);
      if (g.initialDist > 0) {
        const factorRatio = currentDist / g.initialDist;
        const newFactor = Math.min(3.8, Math.max(0.85, g.initialZoom * factorRatio));
        
        if (g.rafId) cancelAnimationFrame(g.rafId);
        g.rafId = requestAnimationFrame(() => {
          setZoomFactor(newFactor);
          triggerBadge();
        });
      }
    } else if (e.touches.length === 1 && g.isPanning && zoomFactor > 1.05) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - g.startTouchX;
      const dy = touch.clientY - g.startTouchY;

      if (g.rafId) cancelAnimationFrame(g.rafId);
      g.rafId = requestAnimationFrame(() => {
        const { maxPanX, maxPanY } = getMaxPan(baseFitScale * zoomFactor);
        const newX = Math.min(maxPanX, Math.max(-maxPanX, g.startPan.x + dx));
        const newY = Math.min(maxPanY, Math.max(-maxPanY, g.startPan.y + dy));
        setPan({ x: newX, y: newY });
      });
    }
  };

  // Touch End
  const handleTouchEnd = () => {
    const g = gestureRef.current;
    if (g.rafId) cancelAnimationFrame(g.rafId);
    setIsInteracting(false);
    g.isPinching = false;
    g.isPanning = false;

    // Bounce back if zoomed out below fit scale
    if (zoomFactor < 0.95) {
      setZoomFactor(1.0);
      setPan({ x: 0, y: 0 });
      if (onZoomModeChange) onZoomModeChange('fit');
    } else if (zoomFactor <= 1.05) {
      setPan({ x: 0, y: 0 });
      if (onZoomModeChange) onZoomModeChange('fit');
    } else {
      if (onZoomModeChange) onZoomModeChange('full');
    }
  };

  // Wheel / Trackpad Pinch Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      setZoomFactor(prev => Math.min(3.8, Math.max(0.85, prev + delta)));
      triggerBadge();
    }
  };

  // Button helpers
  const zoomIn = () => {
    setIsInteracting(false);
    setZoomFactor(prev => Math.min(3.5, prev * 1.3));
    triggerBadge();
  };

  const zoomOut = () => {
    setIsInteracting(false);
    setZoomFactor(prev => Math.max(1.0, prev / 1.3));
    if (zoomFactor <= 1.3) setPan({ x: 0, y: 0 });
    triggerBadge();
  };

  const resetZoom = () => {
    setIsInteracting(false);
    setZoomFactor(1.0);
    setPan({ x: 0, y: 0 });
    if (onZoomModeChange) onZoomModeChange('fit');
    triggerBadge();
  };

  const currentScale = baseFitScale * zoomFactor;
  const currentPercent = Math.round(zoomFactor * 100);

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      className={`relative w-full flex flex-col items-center justify-start overflow-hidden select-none ${className}`}
      style={{
        touchAction: zoomFactor > 1.05 ? 'none' : 'pan-y',
      }}
    >
      {/* ── Floating Zoom HUD Controls ── */}
      {showFloatingControls && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-1.5 py-1 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-md">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoomFactor <= 1.0}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 active:scale-90 transition-all cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={resetZoom}
            className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            title="Double-tap or tap to reset fit"
          >
            {currentPercent}%
          </button>

          <button
            type="button"
            onClick={zoomIn}
            disabled={zoomFactor >= 3.5}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 active:scale-90 transition-all cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {zoomFactor > 1.05 && (
            <button
              type="button"
              onClick={resetZoom}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-90 transition-all cursor-pointer ml-0.5"
              title="Reset to Fit Screen"
              aria-label="Reset to Fit Screen"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Floating Magnification Badge ("no need to remoev this zoom tag.") */}
      {showBadge && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 border border-white/10 dark:border-black/10">
            <span>🔍</span>
            <span>{currentPercent}%</span>
            {zoomFactor > 1.05 && (
              <span className="text-[10px] opacity-75 font-sans">(drag to pan)</span>
            )}
          </div>
        </div>
      )}

      {/* ── GPU-Accelerated Scaled Viewport Container (Fixed width, zero DOM reflow on pinch) ── */}
      <div 
        className="w-full flex justify-center py-2 overflow-visible"
        style={{
          minHeight: '440px',
        }}
      >
        <div
          style={{
            width: `${contentWidth}px`,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${currentScale})`,
            transformOrigin: 'top center',
            transition: isInteracting ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
          }}
          className="shrink-0"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
