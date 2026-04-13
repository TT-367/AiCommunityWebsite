import { cn } from "../../lib/utils";

interface AvatarProps {
  src: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ src, alt, className, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn("rounded-full overflow-hidden bg-surface-2 border border-border flex-shrink-0", sizeClasses[size], className)}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}
