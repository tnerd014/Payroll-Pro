import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
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
  const contentMeasureRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(850);
  const [viewportDimensions, setViewportDimensions] = useState<{ width: number; height: number }>({
    width: 380,
    height: 0,
  });

  // Measure container dimensions on mount and resize
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0) {
          setViewportDimensions({ width: w, height: h });
        }
      }
    };
    updateDimensions();

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0) {
          setViewportDimensions({
            width: Math.round(width),
            height: Math.round(height),
          });
        }
      }
    });
    ro.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Measure natural unconstrained content height at fixed contentWidth (700px)
  useLayoutEffect(() => {
    if (!contentMeasureRef.current) return;
    const measure = () => {
      if (contentMeasureRef.current) {
        const h = contentMeasureRef.current.scrollHeight || contentMeasureRef.current.offsetHeight;
        if (h > 150) {
          setContentHeight(prev => (Math.abs(prev - h) > 4 ? h : prev));
        }
      }
    };
    measure();

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = Math.round(entry.contentRect.height);
        if (h > 150) {
          setContentHeight(prev => (Math.abs(prev - h) > 4 ? h : prev));
        }
      }
    });
    ro.observe(contentMeasureRef.current);
    return () => ro.disconnect();
  }, [children]);

  // Determine whether the container is height-constrained (e.g. h-[340px] mini canvas)
  const isConstrainedHeight = Boolean(
    viewportDimensions.height > 100 && (className.includes('h-full') || className.includes('h-'))
  );

  // Base scale to fit available viewport cleanly with horizontal and vertical margins
  const baseFitScale = useMemo(() => {
    const w = viewportDimensions.width;
    const h = viewportDimensions.height;
    if (w > 0) {
      const scaleW = Math.max(0.3, (w - 16) / contentWidth);
      if (isConstrainedHeight && h > 100 && contentHeight > 150) {
        const scaleH = Math.max(0.25, (h - 20) / contentHeight);
        return Math.min(scaleW, scaleH);
      }
      return Math.min(1.0, scaleW);
    }
    return 0.48;
  }, [viewportDimensions, contentWidth, isConstrainedHeight, contentHeight]);

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

  // Gesture tracking refs
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

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const currentScale = baseFitScale * zoomFactor;
  const currentPercent = Math.round(zoomFactor * 100);

  const scaledWidth = Math.round(contentWidth * baseFitScale);
  const scaledHeight = Math.round(contentHeight * baseFitScale);

  // Max pan calculation
  const getMaxPan = useCallback((scale: number) => {
    const renderedW = contentWidth * scale;
    const renderedH = contentHeight * scale;
    const viewW = isConstrainedHeight ? viewportDimensions.width : scaledWidth;
    const viewH = isConstrainedHeight ? viewportDimensions.height : scaledHeight;
    const maxPanX = Math.max(0, (renderedW - viewW) / 2 + 30);
    const maxPanY = Math.max(0, (renderedH - viewH) / 2 + 30);
    return { maxPanX, maxPanY };
  }, [contentWidth, contentHeight, isConstrainedHeight, viewportDimensions, scaledWidth, scaledHeight]);

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
          // Smooth zoom to 2.0x
          setZoomFactor(2.0);
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

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      className={`relative w-full flex flex-col items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        touchAction: zoomFactor > 1.05 ? 'none' : 'pan-y',
      }}
    >
      {/* ── Floating Zoom HUD Controls ── */}
      {showFloatingControls && (
        <div className="no-print absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-1.5 py-1 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-md">
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

      {/* Floating Magnification Badge */}
      {showBadge && (
        <div className="no-print absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 border border-white/10 dark:border-black/10">
            <span>🔍</span>
            <span>{currentPercent}%</span>
            {zoomFactor > 1.05 && (
              <span className="text-[10px] opacity-75 font-sans">(drag to pan)</span>
            )}
          </div>
        </div>
      )}

      {/* ── GPU-Accelerated Scaled Viewport Container (Snug fit, zero blank space, zero glitching) ── */}
      <div 
        className="w-full flex items-center justify-center overflow-hidden py-0.5"
        style={{
          height: isConstrainedHeight ? '100%' : `${scaledHeight}px`,
          position: 'relative',
        }}
      >
        {/* Sizer Box defining exact scaled footprint */}
        <div
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            position: 'relative',
            flexShrink: 0,
            overflow: 'visible',
          }}
        >
          {/* Centered GPU Transformation Stage */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${contentWidth}px`,
              height: `${contentHeight}px`,
              transform: `translate(-50%, -50%) translate3d(${pan.x}px, ${pan.y}px, 0) scale(${currentScale})`,
              transformOrigin: 'center center',
              transition: isInteracting ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform',
            }}
          >
            {/* Natural Unconstrained Content Layer */}
            <div
              ref={contentMeasureRef}
              style={{
                width: `${contentWidth}px`,
                height: 'max-content',
                minHeight: '100%',
                boxSizing: 'border-box',
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
