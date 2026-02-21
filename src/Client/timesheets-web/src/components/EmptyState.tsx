interface EmptyStateProps {
  icon: string;
  message: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function EmptyState({ icon, message, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '48px', color: '#C29B40', opacity: 0.5 }}
      >
        {icon}
      </span>
      <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px' }}>
        {message}
      </div>
      {ctaLabel && onCtaClick && (
        <button
          onClick={onCtaClick}
          style={{
            marginTop: '16px',
            padding: '8px 20px',
            backgroundColor: '#002349',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
