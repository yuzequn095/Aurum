'use client';

import { ReactNode, useEffect } from 'react';

export function Modal(props: {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { open, title, children, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{title ?? 'Modal'}</div>
          <button
            onClick={onClose}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: '6px 10px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}
