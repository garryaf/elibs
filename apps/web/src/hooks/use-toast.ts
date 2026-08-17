"use client";

import { useState, useCallback, useRef } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UseToastOptions {
  /** Duration in ms before toast auto-dismisses. Default: 5000 */
  duration?: number;
}

/**
 * A lightweight toast hook for inline error/success banners.
 * Replaces native alert() with dismissible inline messages.
 */
export function useToast(options: UseToastOptions = {}) {
  const { duration = 5000 } = options;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "error") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [duration, dismiss]
  );

  const success = useCallback(
    (message: string) => toast(message, "success"),
    [toast]
  );

  const error = useCallback(
    (message: string) => toast(message, "error"),
    [toast]
  );

  const warning = useCallback(
    (message: string) => toast(message, "warning"),
    [toast]
  );

  const info = useCallback(
    (message: string) => toast(message, "info"),
    [toast]
  );

  return { toasts, toast, success, error, warning, info, dismiss };
}
