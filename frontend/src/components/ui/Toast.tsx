'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

const COLORS: Record<ToastType, string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: '#1559C9',
};

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '⛔',
  info: 'ℹ️',
};

export default function Toast({
  message,
  type = 'info',
  onClose,
}: {
  message: string;
  type?: ToastType;
  onClose?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onClose?.(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg"
      style={{ backgroundColor: COLORS[type] }}
    >
      <span>{ICONS[type]}</span>
      <span>{message}</span>
    </div>
  );
}
