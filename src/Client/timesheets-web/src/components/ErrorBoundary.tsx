import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  level?: 'app' | 'page';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const isApp = this.props.level === 'app';

      const outer: React.CSSProperties = isApp
        ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            padding: '20px',
          }
        : {};

      return (
        <div style={outer} className={isApp ? undefined : 'page-container page-container--centered'}>
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              textAlign: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: '#dc2626' }}
            >
              error_outline
            </span>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#002349',
                marginTop: '16px',
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: '#666666',
                marginTop: '8px',
              }}
            >
              An unexpected error occurred. You can try again or reload the page.
            </p>

            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={this.handleRetry}
                style={{
                  backgroundColor: '#002349',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
            </div>

            <button
              onClick={this.toggleDetails}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '12px',
                cursor: 'pointer',
                marginTop: '16px',
                textDecoration: 'underline',
              }}
            >
              {this.state.showDetails ? 'Hide Details' : 'Show Details'}
            </button>

            {this.state.showDetails && (
              <pre
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#64748b',
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
