import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export function showArtworkNotification(message, icon = 'check_circle') {
  window.dispatchEvent(new CustomEvent('artwork-notification', { detail: { message, icon } }));
}

export default function ToastNotifications() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const showToast = (event) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const message = event.detail?.message ?? 'Done';
      const icon = event.detail?.icon ?? 'check_circle';

      setToasts((current) => [...current, { id, message, icon, isHiding: false }]);

      window.setTimeout(() => {
        setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, isHiding: true } : toast)));
      }, 3000);

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3600);
    };

    window.addEventListener('artwork-notification', showToast);
    return () => window.removeEventListener('artwork-notification', showToast);
  }, []);

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast-notification ${toast.isHiding ? 'is-hiding' : ''}`} key={toast.id}>
          <Icon name={toast.icon} />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
