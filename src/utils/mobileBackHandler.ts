import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type BackHandlerFn = () => boolean;

// LIFO stack of active overlay handlers (modals, sheets, menus, popovers)
const activeHandlers: BackHandlerFn[] = [];

/**
 * Register an overlay/modal back handler.
 * Called in LIFO order when the hardware back button or browser popstate occurs.
 * Return true if handled (consumed); return false to allow lower handlers to run.
 */
export function registerBackHandler(handler: BackHandlerFn): () => void {
  activeHandlers.push(handler);
  return () => {
    const idx = activeHandlers.lastIndexOf(handler);
    if (idx !== -1) {
      activeHandlers.splice(idx, 1);
    }
  };
}

let lastBackPress = 0;

/**
 * Execute the top-level back action:
 * 1. Closes the topmost active overlay/modal/sheet.
 * 2. If no overlay is open, delegates to `onPopHistory` to navigate to the previous screen.
 * 3. If already at the root screen, triggers double-tap confirmation to exit.
 */
export function executeBackAction(
  onPopHistory: () => boolean,
  showExitNotice?: () => void
): boolean {
  // 1. Run top-most overlay/sheet handler
  for (let i = activeHandlers.length - 1; i >= 0; i--) {
    const handler = activeHandlers[i];
    try {
      const consumed = handler();
      if (consumed) {
        return true;
      }
    } catch (err) {
      console.warn('[mobileBackHandler] handler error:', err);
    }
  }

  // 2. Pop navigation history
  const popped = onPopHistory();
  if (popped) {
    return true;
  }

  // 3. At root screen: double-tap back within 2s to exit
  const now = Date.now();
  if (now - lastBackPress < 2000) {
    if (Capacitor.isNativePlatform()) {
      CapApp.exitApp();
    }
    return false;
  }

  lastBackPress = now;
  if (showExitNotice) {
    showExitNotice();
  }
  return true;
}

/**
 * Initialize native Capacitor backButton listener and browser popstate listener.
 */
export function initializeMobileBackHandler(
  onPopHistory: () => boolean,
  showExitNotice?: () => void
): () => void {
  let isCleanedUp = false;

  const handleBack = () => {
    if (isCleanedUp) return;
    executeBackAction(onPopHistory, showExitNotice);
  };

  // Capacitor Native Android Hardware Back Button
  let capListenerPromise: Promise<any> | null = null;
  try {
    capListenerPromise = CapApp.addListener('backButton', () => {
      handleBack();
    });
  } catch (e) {
    console.debug('[mobileBackHandler] Capacitor App listener not available:', e);
  }

  // Browser / PWA popstate listener
  const handlePopState = () => {
    handleBack();
    // Re-push a state entry so the browser keeps an entry and doesn't exit the site
    try {
      window.history.pushState({ app: 'payroll-pro' }, '');
    } catch {}
  };

  // Seed the initial history state so the browser has an entry to pop
  try {
    if (!window.history.state || !window.history.state.app) {
      window.history.pushState({ app: 'payroll-pro' }, '');
    }
  } catch {}

  window.addEventListener('popstate', handlePopState);

  return () => {
    isCleanedUp = true;
    window.removeEventListener('popstate', handlePopState);
    if (capListenerPromise) {
      capListenerPromise.then((handle) => handle?.remove?.()).catch(() => {});
    }
  };
}

