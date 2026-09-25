import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Download, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ChitLedger application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleExportEmergencyBackup = () => {
    try {
      const backupData: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chit_fund_')) {
          try {
            backupData[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            backupData[key] = localStorage.getItem(key);
          }
        }
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `emergency_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Failed to generate emergency backup:', e);
    }
  };

  private handleClearCorruptedState = () => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chit_fund_')) {
        localStorage.removeItem(key);
      }
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--m3-surface,#f8f9fc)] text-[var(--m3-on-surface,#191c20)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--m3-surface-container,#ffffff)] border border-[var(--m3-outline-variant,#e0e2e8)] rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-[var(--m3-on-surface,#191c20)]">
                Application Recovered from Error
              </h1>
              <p className="text-xs text-[var(--m3-on-surface-variant,#44474f)] mt-2 leading-relaxed">
                ChitLedger encountered an unexpected render issue. Your financial data is preserved safely in local storage.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[var(--m3-surface-container-low,#f1f3f9)] rounded-xl border border-[var(--m3-outline-variant,#e0e2e8)] text-left">
                <span className="text-[10px] font-mono text-[var(--m3-on-surface-variant,#44474f)] uppercase tracking-wider block font-bold">
                  Error Details:
                </span>
                <p className="text-xs font-mono text-rose-600 dark:text-rose-400 mt-1 break-words">
                  {this.state.error.message || 'Unknown render exception'}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 rounded-full bg-[var(--m3-primary,#0b57d0)] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleExportEmergencyBackup}
                className="w-full py-2.5 rounded-full border border-[var(--m3-outline-variant,#e0e2e8)] bg-[var(--m3-surface-container-low,#f1f3f9)] text-[var(--m3-on-surface,#191c20)] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-[var(--m3-surface-container-high,#edf0f6)] transition-colors"
              >
                <Download className="w-4 h-4 text-[var(--m3-primary,#0b57d0)]" />
                <span>Download Emergency Backup</span>
              </button>

              <button
                onClick={this.handleClearCorruptedState}
                className="text-[11px] text-[var(--m3-on-surface-variant,#44474f)] hover:text-rose-500 py-1 cursor-pointer transition-colors"
              >
                Reset Application Cache to Factory Defaults
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
