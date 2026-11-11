"use client";

import { CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { uid } from "@/lib/utils";

type ToastOptions = {
  message: string;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastOptions & { id: string };

const ToastContext = createContext<(toast: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (toast: ToastOptions) => {
      const id = uid();
      setToasts((ts) => [...ts.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.action ? 6000 : 2600);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-in pointer-events-auto flex items-center gap-3 rounded-xl bg-ink py-2.5 pr-2.5 pl-3.5 text-sm text-bg shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)]"
          >
            <CircleCheck className="size-4 shrink-0 opacity-80" />
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="rounded-lg px-2 py-0.5 font-semibold underline-offset-2 hover:underline"
              >
                {toast.action.label}
              </button>
            ) : (
              <span className="w-1" />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
