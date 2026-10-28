import React from 'react';

interface AndroidDeviceFrameProps {
  isFramed: boolean;
  children: React.ReactNode;
}

export const AndroidDeviceFrame: React.FC<AndroidDeviceFrameProps> = ({
  isFramed,
  children,
}) => {
  if (!isFramed) {
    // Standard 100% responsive mobile layout
    return (
      <div className="w-full h-full flex flex-col bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
        {children}
      </div>
    );
  }

  // Google Pixel 8 Framed Simulator Mode (for testing on desktop)
  return (
    <div className="w-full h-full flex items-center justify-center p-2 sm:p-6 bg-zinc-900/90 backdrop-blur-md overflow-hidden">
      
      {/* Outer Phone Chassis */}
      <div className="relative w-full max-w-[420px] h-[92vh] max-h-[890px] bg-zinc-950 rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border-4 border-zinc-700/80 ring-1 ring-white/10 flex flex-col overflow-hidden">
        
        {/* Android Punch Hole Camera */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-zinc-800 z-50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 ring-1 ring-zinc-700/50" />
        </div>

        {/* Screen Glass Viewport */}
        <div id="android-screen-viewport" className="relative w-full h-full bg-[#fbfbfb] dark:bg-[#09090b] rounded-[38px] overflow-hidden flex flex-col border border-zinc-800 [transform:translateZ(0)]">
          {children}
        </div>

      </div>

    </div>
  );
};
