'use client';

type ToastItem = {
  id: number;
  kind: 'success' | 'error';
  message: string;
};

type ToastContainerProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const tone =
          toast.kind === 'success'
            ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
            : 'border-red-700 bg-red-50 text-red-900';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow ${tone}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="m-0">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="rounded px-1 text-xs opacity-70 hover:opacity-100"
                onClick={() => onDismiss(toast.id)}
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
