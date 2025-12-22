'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, onUndo, onDismiss, duration = 2000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className="toast">
      <span className="toast-message">{message}</span>
      <button className="toast-undo-button" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}



