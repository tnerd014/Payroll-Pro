import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Global Android Print Bridge interceptor for Capacitor Android APK
if (typeof window !== 'undefined') {
  const originalPrint = window.print;
  window.print = function () {
    const androidPrinter = (window as any).AndroidPrinter;
    if (androidPrinter && typeof androidPrinter.print === 'function') {
      try {
        androidPrinter.print();
        return;
      } catch (err) {
        console.warn('AndroidPrinter invocation fallback to originalPrint:', err);
      }
    }
    originalPrint.call(window);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary isRootLevel>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
