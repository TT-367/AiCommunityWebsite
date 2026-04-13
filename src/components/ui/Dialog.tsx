import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("DialogTrigger must be used within Dialog");

  const onClick = (e: React.MouseEvent) => {
    children.props.onClick?.(e);
    if (!e.defaultPrevented) ctx.onOpenChange(true);
  };

  if (asChild) return React.cloneElement(children, { onClick });
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

export function DialogContent({
  children,
  className,
  overlayClassName,
  viewportClassName,
  hideCloseButton,
}: {
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  viewportClassName?: string;
  hideCloseButton?: boolean;
}) {
  const ctx = React.useContext(DialogContext);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!ctx?.open) return;
    const prev = document.activeElement as HTMLElement | null;
    contentRef.current?.focus();
    return () => {
      prev?.focus?.();
    };
  }, [ctx?.open]);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ctx]);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [ctx?.open]);

  if (!ctx?.open) return null;

  const node = (
    <div className="fixed inset-0 z-[200]">
      <div
        className={cn("absolute inset-0 bg-background/70 backdrop-blur-[1px]", overlayClassName)}
        onMouseDown={() => ctx.onOpenChange(false)}
      />
      <div className={cn("absolute inset-0 flex items-center justify-center p-4", viewportClassName)}>
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cn(
            "relative w-full max-w-lg rounded-xl border border-border bg-surface text-foreground shadow-e3 outline-none",
            className
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="sr-only" id={titleId} />
          <div className="sr-only" id={descriptionId} />
          {!hideCloseButton && (
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => ctx.onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 px-6 pt-6", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-ui-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-ui-md text-muted-foreground", className)} {...props} />;
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 px-6 pb-6", className)} {...props} />;
}
