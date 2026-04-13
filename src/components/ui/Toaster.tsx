import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";
import type { ToastItem, ToastVariant } from "./useToast";
import { useToast } from "./useToast";

const variantClasses: Record<ToastVariant, string> = {
  default: "border-border bg-surface text-foreground",
  success: "border-success/30 bg-surface text-foreground",
  warning: "border-warning/30 bg-surface text-foreground",
  destructive: "border-destructive/30 bg-surface text-foreground",
  info: "border-info/30 bg-surface text-foreground",
};

const dotClasses: Record<ToastVariant, string> = {
  default: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex ui-toast-stack flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  React.useEffect(() => {
    const ms = t.durationMs ?? 4500;
    if (ms <= 0) return;
    const timer = window.setTimeout(() => onDismiss(), ms);
    return () => window.clearTimeout(timer);
  }, [onDismiss, t.durationMs]);

  const variant: ToastVariant = t.variant ?? "default";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-4 py-3 shadow-e3",
        "backdrop-blur supports-[backdrop-filter]:bg-surface/80",
        variantClasses[variant]
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", dotClasses[variant])} />
        <div className="min-w-0 flex-1">
          {t.title && <div className="text-sm font-semibold leading-tight">{t.title}</div>}
          {t.description && <div className="mt-0.5 text-sm text-muted-foreground">{t.description}</div>}
          {t.actionLabel && t.onAction && (
            <div className="mt-2">
              <Button
                size="sm"
                variant={variant === "destructive" ? "destructive" : "outline"}
                onClick={() => {
                  t.onAction?.();
                  onDismiss();
                }}
              >
                {t.actionLabel}
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
