import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  Home, 
  Trash2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert,
  Terminal
} from 'lucide-react';

interface Props {
  children: ReactNode;
  isRootLevel?: boolean;
  onResetView?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onResetView) {
      this.props.onResetView();
    }
  };

  private handleCopyError = () => {
    const errorText = `[Payroll Pro Error Report]\nDate: ${new Date().toISOString()}\nError: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown'}\nStack:\n${this.state.error?.stack || 'No stack'}\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'No component stack'}`;
    
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  private handleResetData = () => {
    if (confirm('Warning: This will purge local cached storage and restore the application to fresh defaults. Are you sure you want to continue?')) {
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const isRoot = Boolean(this.props.isRootLevel);
      const isDarkMode = document.documentElement.classList.contains('dark') || 
        window.matchMedia?.('(prefers-color-scheme: dark)').matches;

      return (
        <div className={`${isRoot ? 'min-h-screen w-screen' : 'flex-1 min-h-[420px]'} flex flex-col items-center justify-center p-6 bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 select-none animate-fade-in`}>
          
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 text-center">
            
            {/* Top Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            {/* Error Titles */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                {isRoot ? 'Fatal Application Error' : 'Screen Rendering Error'}
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {isRoot ? 'Payroll Pro encountered a critical error' : 'Something went wrong rendering this view'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                The interface was safely interrupted to protect your data integrity. You can retry, reload, or restart in Safe Mode.
              </p>
            </div>

            {/* Error Message Box */}
            {this.state.error && (
              <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-left space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="uppercase font-semibold">Error Message:</span>
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                    title="Copy Error to Clipboard"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                
                <code className="text-xs font-mono text-rose-600 dark:text-rose-400 break-all block leading-relaxed">
                  {this.state.error.message || String(this.state.error)}
                </code>

                {/* Collapsible Stack Trace */}
                <div>
                  <button
                    type="button"
                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition font-medium pt-1"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>{this.state.showDetails ? 'Hide Stack Trace' : 'View Stack Trace'}</span>
                    {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {this.state.showDetails && (
                    <pre className="mt-2 text-[10px] font-mono bg-zinc-900 text-zinc-300 dark:bg-black dark:text-zinc-400 p-2.5 rounded overflow-x-auto max-h-40 leading-normal select-text">
                      {this.state.error.stack || 'No stack trace available'}
                      {this.state.errorInfo?.componentStack && `\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              {!isRoot && (
                <button
                  type="button"
                  onClick={this.handleTryAgain}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg font-medium text-xs hover:opacity-90 transition cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              )}

              <button
                type="button"
                onClick={this.handleReload}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 ${
                  isRoot 
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs' 
                    : 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                } rounded-lg font-medium text-xs transition cursor-pointer`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Window</span>
              </button>
            </div>

            {/* Footer Notice */}
            <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
              Payroll Pro Desktop &bull; Offline Architecture
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
