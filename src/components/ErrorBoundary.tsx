import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Trash2 } from 'lucide-react';
import { storage } from '../infrastructure/storage/StorageAdapter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Robust, user-friendly and developer-friendly Error Boundary
 * Prevents screen blanking and helps recover corrupted state.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CRITICAL RUNTIME ERROR trapped by ErrorBoundary]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (window.confirm('Tüm yerel veriler sıfırlanacaktır. Emin misiniz?')) {
      storage.clearNamespace();
      localStorage.clear(); // Clear all backup data if any
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="error-boundary-screen" className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div id="error-boundary-card" className="max-w-md w-full bg-white rounded-2xl border border-slate-150 p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bir Şeyler Yanlış Gitti</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Uygulama çalışırken beklenmedik bir sistem hatası oluştu. Aşağıdaki butonları kullanarak sistemi kurtarmayı deneyebilirsiniz.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-200">
                <p className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider mb-1">Hata Raporu</p>
                <div className="max-h-24 overflow-y-auto text-xs font-mono text-red-600 break-all leading-normal">
                  {this.state.error.name}: {this.state.error.message}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-error-reload"
                onClick={this.handleReload}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-100 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Sayfayı Yenile
              </button>
              <button
                id="btn-error-reset"
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Tüm verileri temizle ve baştan başlat"
              >
                <Trash2 className="w-4 h-4 text-slate-400" /> Veriyi Sıfırla
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-mono">
              Berkaytur Servis Operasyon Platformu v2.0 - Production Foundation Layer
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
