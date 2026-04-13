import { cn } from "../../lib/utils";
import type React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  className?: string;
}

export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border-strong text-foreground hover:bg-accent',
    secondary: 'bg-accent text-accent-foreground hover:bg-accent/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
      variants[variant],
      className
    )} {...props}>
      {children}
    </span>
  );
}
