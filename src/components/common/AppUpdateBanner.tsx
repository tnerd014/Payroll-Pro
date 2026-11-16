import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  DownloadCloud, 
  CheckCircle2, 
  RotateCw, 
  X, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export interface AppUpdateState {
  status: 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';
  version: string;
  latestVersion: string;
  releaseUrl: string;
  downloadUrl: string;
  downloadPath: string;
  downloadPercent: number;
  message: string;
  restartRequired: boolean;
}

export const AppUpdateBanner: React.FC = () => {
  const [updateState, setUpdateState] = useState<AppUpdateState>({
    status: 'idle',
    version: '',
    latestVersion: '',
    releaseUrl: '',
    downloadUrl: '',
    downloadPath: '',
    downloadPercent: 0,
    message: '',
    restartRequired: false,
  });

  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Global helper for testing in browser console or settings button
    (window as any).__testUpdateBanner = (stage: 'available' | 'downloading' | 'downloaded' = 'available') => {
      (window as any).__isMockingUpdate = true;
      setIsDismissed(false);
      if (stage === 'available') {
        setUpdateState({
          status: 'available',
          version: '1.0.7',
          latestVersion: '1.0.8',
          releaseUrl: 'https://github.com/tnerd014/Payroll-Pro/releases',
          downloadUrl: 'https://github.com/tnerd014/Payroll-Pro/releases/download/v1.0.8/Payroll-Pro-Setup-1.0.8.exe',
          downloadPath: '',
          downloadPercent: 0,
          message: 'Payroll Pro v1.0.8 is available',
          restartRequired: false,
        });
      } else if (stage === 'downloading') {
        setUpdateState({
          status: 'downloading',
          version: '1.0.7',
          latestVersion: '1.0.8',
          releaseUrl: '',
          downloadUrl: '',
          downloadPath: '',
          downloadPercent: 45,
          message: 'Downloading update',
          restartRequired: false,
        });
      } else if (stage === 'downloaded') {
        setUpdateState({
          status: 'downloaded',
          version: '1.0.7',
          latestVersion: '1.0.8',
          releaseUrl: '',
          downloadUrl: '',
          downloadPath: '',
          downloadPercent: 100,
          message: 'Update ready to apply',
          restartRequired: true,
        });
      }
    };

    const handleMockEvent = (e: any) => {
      if (e.detail) {
        (window as any).__isMockingUpdate = true;
        setUpdateState(e.detail);
        setIsDismissed(false);
      }
    };
    window.addEventListener('mock-app-update-state', handleMockEvent);

    const electronAPI = (typeof window !== 'undefined' ? (window as any).electronAPI : undefined);
    if (!electronAPI) {
      return () => {
        window.removeEventListener('mock-app-update-state', handleMockEvent);
      };
    }

    // 1. Initial State Query
    if (electronAPI.getUpdateState) {
      electronAPI.getUpdateState().then((initialState: AppUpdateState) => {
        if (initialState && initialState.status !== 'idle') {
          setUpdateState(initialState);
        }
      }).catch(() => {});
    }

    // 2. Real-Time State Subscription
    if (electronAPI.onUpdateState) {
      const unsubscribe = electronAPI.onUpdateState((nextState: AppUpdateState) => {
        if (nextState) {
          (window as any).__isMockingUpdate = false;
          setUpdateState(nextState);
          // Re-open if status transitions to downloaded or downloading
          if (nextState.status === 'downloading' || nextState.status === 'downloaded') {
            setIsDismissed(false);
          }
        }
      });
      return () => {
        window.removeEventListener('mock-app-update-state', handleMockEvent);
        unsubscribe?.();
      };
    }

    return () => {
      window.removeEventListener('mock-app-update-state', handleMockEvent);
    };
  }, []);

  const handleStartDownload = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.downloadUpdate && !(window as any).__isMockingUpdate) {
      try {
        await electronAPI.downloadUpdate({
          latestVersion: updateState.latestVersion,
          releaseUrl: updateState.releaseUrl,
          downloadUrl: updateState.downloadUrl,
        });
        return;
      } catch (err) {
        console.error('Failed to start update download:', err);
      }
    }

    // Mock progress simulation for interactive UI demonstration
    setUpdateState(prev => ({ ...prev, status: 'downloading', downloadPercent: 0 }));
    let progress = 0;
    const interval = setInterval(() => {
      progress += 12;
      if (progress >= 100) {
        clearInterval(interval);
        setUpdateState(prev => ({
          ...prev,
          status: 'downloaded',
          downloadPercent: 100,
          restartRequired: true,
        }));
      } else {
        setUpdateState(prev => ({
          ...prev,
          status: 'downloading',
          downloadPercent: progress,
        }));
      }
    }, 280);
  };

  const handleRestartToInstall = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.installPendingUpdate && !(window as any).__isMockingUpdate) {
      setIsInstalling(true);
      try {
        const res = await electronAPI.installPendingUpdate();
        if (!res?.success) {
          setIsInstalling(false);
          alert(res?.error || 'Unable to launch installer.');
        }
      } catch (err) {
        setIsInstalling(false);
        console.error('Failed to trigger update restart:', err);
      }
      return;
    }

    // Mock simulation
    setIsInstalling(true);
    setTimeout(() => {
      setIsInstalling(false);
      setIsDismissed(true);
      setUpdateState(prev => ({ ...prev, status: 'idle' }));
      (window as any).__isMockingUpdate = false;
      alert(`[Mock Simulation] Payroll Pro v${updateState.latestVersion} update verified. In production, this closes the app and launches the silent installer.`);
    }, 1200);
  };

  const handleOpenReleaseNotes = () => {
    const electronAPI = (window as any).electronAPI;
    if (updateState.releaseUrl) {
      if (electronAPI?.openUpdateRelease) {
        electronAPI.openUpdateRelease(updateState.releaseUrl);
      } else {
        window.open(updateState.releaseUrl, '_blank');
      }
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.dismissUpdateNotice) {
      electronAPI.dismissUpdateNotice().catch(() => {});
    }
  };

  // Do not render if idle or manually dismissed for 'available'
  if (updateState.status === 'idle') return null;
  if (isDismissed && updateState.status === 'available') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full mx-4 sm:mx-0 animate-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 text-zinc-900 dark:text-zinc-100 select-none relative overflow-hidden backdrop-blur-md">
        
        {/* Subtle accent hairline at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          updateState.status === 'downloaded'
            ? 'bg-emerald-500'
            : updateState.status === 'downloading'
              ? 'bg-blue-500'
              : updateState.status === 'error'
                ? 'bg-rose-500'
                : 'bg-zinc-900 dark:bg-white'
        }`} />

        {/* STATE 1: Update Available */}
        {updateState.status === 'available' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-900 dark:text-zinc-100">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold tracking-tight">
                      Update Available
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                      v{updateState.latestVersion}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    A new version is ready to install
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-6 h-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleStartDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-colors shadow-2xs cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Download and Prepare Update</span>
              </button>

              {updateState.releaseUrl && (
                <button
                  type="button"
                  onClick={handleOpenReleaseNotes}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
                  title="View Release Notes"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STATE 2: Downloading Progress */}
        {updateState.status === 'downloading' && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span className="font-bold tracking-tight">
                  Downloading v{updateState.latestVersion}
                </span>
              </div>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {updateState.downloadPercent}%
              </span>
            </div>

            {/* Animated Gradient Progress Bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-150 ease-out shadow-xs animate-pulse"
                style={{ width: `${Math.max(updateState.downloadPercent, 4)}%` }}
              />
            </div>

            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              You can keep working while the update downloads in the background.
            </p>
          </div>
        )}

        {/* STATE 3: Download Complete - Prompt to Restart */}
        {updateState.status === 'downloaded' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    Update Ready to Apply
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    v{updateState.latestVersion}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Download finished. Restart to apply the new version.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isInstalling}
                onClick={handleRestartToInstall}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isInstalling ? 'animate-spin' : ''}`} />
                <span>{isInstalling ? 'Restarting…' : 'Restart to Update'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: Error State */}
        {updateState.status === 'error' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Update Failed</span>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-5 h-5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {updateState.message || 'Could not download the update. Please try again.'}
            </p>
            <button
              type="button"
              onClick={handleStartDownload}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline pt-1 cursor-pointer"
            >
              Retry Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

