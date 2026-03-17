import { cn } from "../../lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-black text-white hover:bg-gray-800',
    outline: 'border border-gray-200 text-gray-800 hover:bg-gray-50',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
