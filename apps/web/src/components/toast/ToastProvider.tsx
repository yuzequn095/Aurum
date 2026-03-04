'use client';

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ToastContainer } from '@/components/toast/ToastContainer';

type ToastKind = 'success' | 'error';

type ToastState = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let toastBridge: ToastApi | null = null;

function showExternal(kind: ToastKind, message: string) {
  if (!toastBridge) return;
  if (kind === 'success') toastBridge.success(message);
  if (kind === 'error') toastBridge.error(message);
}

export const toast: ToastApi = {
  success: (message) => showExternal('success', message),
  error: (message) => showExternal('error', message),
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { id, kind, message: trimmed }]);
    const timeout = setTimeout(() => dismiss(id), 3000);
    timersRef.current.set(id, timeout);
  }, [dismiss]);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  );

  useEffect(() => {
    toastBridge = api;
    const timers = timersRef.current;
    return () => {
      toastBridge = null;
      timers.forEach((timeout) => clearTimeout(timeout));
      timers.clear();
    };
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
