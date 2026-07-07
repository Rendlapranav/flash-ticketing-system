import { useCallback, useEffect, useState } from 'react';
import { NotificationContext } from './notification-store';

const NOTIF_COLORS = {
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  error: 'bg-red-500/15 border-red-500/30 text-red-300',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  info: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
};

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const notify = useCallback((type, text) => {
    setNotification({ type, text });
  }, []);

  useEffect(() => {
    if (!notification) return;
    const id = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(id);
  }, [notification]);

  return (
    <NotificationContext.Provider value={notify}>
      {children}

      {notification && (
        <div className="fixed bottom-5 left-0 right-0 z-[60] flex justify-center pointer-events-none px-4">
          <button
            onClick={() => setNotification(null)}
            className={`pointer-events-auto px-5 py-3 rounded-xl backdrop-blur-xl border text-sm font-medium shadow-lg animate-slide-up cursor-pointer max-w-md text-center ${
              NOTIF_COLORS[notification.type] || NOTIF_COLORS.info
            }`}
          >
            {notification.text}
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
