import { useState, useCallback, useRef, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmState {
  actionName: string;
  confirmLabel?: string;
}

interface ConfirmContextValue {
  confirm: (actionName: string, confirmLabel?: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [dialog, setDialog] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((actionName: string, confirmLabel?: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialog({ actionName, confirmLabel });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setDialog(null);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setDialog(null);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmContext value={{ confirm }}>
      {children}
      {dialog && createPortal(
        <ConfirmDialogUI
          dialog={dialog}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />,
        document.body
      )}
    </ConfirmContext>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
};

function ConfirmDialogUI({
  dialog,
  onConfirm,
  onCancel,
}: {
  dialog: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          margin: '0 16px',
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'scaleIn 0.2s ease-out',
        }}
      >
        {/* Header area */}
        <div style={{ padding: '24px 24px 0 24px' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '36px', color: '#dc2626' }}
          >
            warning
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 24px 24px 24px' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#002349',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            Are you sure?
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#666666',
              marginTop: '8px',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            You are about to {dialog.actionName}. This action cannot be undone.
          </div>
        </div>

        {/* Button row */}
        <div
          style={{
            padding: '0 24px 24px 24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {dialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
