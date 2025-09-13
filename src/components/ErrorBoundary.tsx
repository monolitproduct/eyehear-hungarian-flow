import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="relative min-h-[100dvh] flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0 bg-animated-purple opacity-75" />
          <div className="relative mx-auto max-w-2xl px-4 py-8">
            <Card className="border border-red-500/20 bg-red-500/5 backdrop-blur-md">
              <CardHeader className="text-center">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <CardTitle className="text-2xl text-red-300">
                  Váratlan hiba történt
                </CardTitle>
                <CardDescription className="text-neutral-300">
                  Az alkalmazás hibába ütközött és újraindítás szükséges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={this.handleRetry}
                    className="flex-1 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('common.retry')}
                  </Button>
                  <Button 
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Oldal frissítése
                  </Button>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-4 bg-black/20 rounded-lg border border-white/10">
                    <summary className="cursor-pointer text-sm text-neutral-300 flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Hibakeresési információk
                    </summary>
                    <div className="mt-2 text-xs text-red-300 font-mono">
                      <div className="mb-2">
                        <strong>Hiba:</strong> {this.state.error.message}
                      </div>
                      <div className="mb-2">
                        <strong>Stack trace:</strong>
                        <pre className="whitespace-pre-wrap text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}