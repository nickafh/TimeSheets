import { useState, useCallback, useRef, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ message, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(null);
  }, []);

  return (
    <ToastContext value={{ showToast }}>
      {children}
      {toast && createPortal(
        <ToastUI toast={toast} onDismiss={handleDismiss} />,
        document.body
      )}
    </ToastContext>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

const bgColors: Record<ToastType, string> = {
  success: '#059669',
  error: '#dc2626',
  info: '#002349',
};

const icons: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

function ToastUI({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '500px',
        padding: '14px 20px',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: bgColors[toast.type],
        color: 'white',
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: "'Montserrat', sans-serif",
        animation: 'slideInDown 0.3s ease-out',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '20px', color: 'white' }}
      >
        {icons[toast.type]}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.type === 'error' && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            marginLeft: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
        </button>
      )}
    </div>
  );
}
