import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  triggerToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const triggerToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global override of window.alert to capture native alerts app-wide
  React.useEffect(() => {
    (window as any).__triggerToast = (msg: string, type: ToastType = 'info') => {
      let determinedType = type;
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('success') || lowerMsg.includes('congratulations') || lowerMsg.includes('approved') || lowerMsg.includes('sync')) {
        determinedType = 'success';
      } else if (lowerMsg.includes('fail') || lowerMsg.includes('error') || lowerMsg.includes('invalid') || lowerMsg.includes('required') || lowerMsg.includes('unauthorized')) {
        determinedType = 'error';
      } else if (lowerMsg.includes('warning') || lowerMsg.includes('missing') || lowerMsg.includes('empty') || lowerMsg.includes('locked') || lowerMsg.includes('must')) {
        determinedType = 'warning';
      }
      triggerToast(msg, determinedType);
    };

    const nativeAlert = window.alert;
    window.alert = (message: any) => {
      if ((window as any).__triggerToast) {
        (window as any).__triggerToast(String(message));
      } else {
        nativeAlert(message);
      }
    };

    return () => {
      window.alert = nativeAlert;
      (window as any).__triggerToast = undefined;
    };
  }, [triggerToast]);

  return (
    <ToastContext.Provider value={{ triggerToast }}>
      {children}
      <div 
        className="global-toasts-container" 
        style={{ 
          position: 'fixed', 
          top: '24px', 
          right: '24px', 
          zIndex: 9999, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          maxWidth: '380px',
          width: '100%',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => {
          let Icon = Info;
          let borderLeftColor = 'var(--accent-color)';
          let iconColor = 'var(--accent-color)';
          if (toast.type === 'success') {
            Icon = CheckCircle;
            borderLeftColor = 'var(--success-color, #10b981)';
            iconColor = 'var(--success-color, #10b981)';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            borderLeftColor = 'var(--warning-color, #f97316)';
            iconColor = 'var(--warning-color, #f97316)';
          } else if (toast.type === 'error') {
            Icon = AlertOctagon;
            borderLeftColor = 'var(--danger-color, #ef4444)';
            iconColor = 'var(--danger-color, #ef4444)';
          }

          return (
            <div 
              key={toast.id}
              className="toast-alert-card glass-panel"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: 'var(--border-radius-sm, 8px)',
                background: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${borderLeftColor}`,
                boxShadow: 'var(--shadow-premium, 0 10px 30px rgba(0,0,0,0.15))',
                animation: 'slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {toast.message}
              </span>
              <button 
                onClick={() => removeToast(toast.id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
