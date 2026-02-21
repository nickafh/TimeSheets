interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullPage?: boolean;
}

const dotSizeMap: Record<string, number> = {
  sm: 6,
  md: 10,
  lg: 14,
};

export function LoadingSpinner({ size = 'md', message, fullPage = false }: LoadingSpinnerProps) {
  const dotSize = dotSizeMap[size];

  const dotStyle = (delay: number): React.CSSProperties => ({
    display: 'inline-block',
    width: `${dotSize}px`,
    height: `${dotSize}px`,
    borderRadius: '50%',
    backgroundColor: '#C29B40',
    animation: 'pulse-dot 1.4s infinite ease-in-out both',
    animationDelay: `${delay}s`,
    margin: '0 4px',
  });

  const dots = (
    <div>
      <span style={dotStyle(0)} />
      <span style={dotStyle(0.2)} />
      <span style={dotStyle(0.4)} />
    </div>
  );

  const messageEl = message ? (
    <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px' }}>{message}</div>
  ) : null;

  if (fullPage) {
    return (
      <div className="page-container page-container--centered" style={{ textAlign: 'center' }}>
        {dots}
        {messageEl}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      {dots}
      {messageEl}
    </div>
  );
}
