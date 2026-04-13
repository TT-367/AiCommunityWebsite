import { create } from "zustand";

export type ToastVariant = "default" | "success" | "warning" | "destructive" | "info";

export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastState = {
  toasts: ToastItem[];
  push: (t: ToastItem) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [t, ...s.toasts].slice(0, 5) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export function toast(input: Omit<ToastItem, "id"> & { id?: string }) {
  const id = input.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  useToastStore.getState().push({ ...input, id });
  return id;
}

export function useToast() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const clear = useToastStore((s) => s.clear);
  return { toasts, toast, dismiss, clear };
}

