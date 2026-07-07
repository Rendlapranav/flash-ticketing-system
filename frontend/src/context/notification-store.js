import { createContext, useContext } from 'react';

export const NotificationContext = createContext(null);

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used within a NotificationProvider');
  return ctx;
}
