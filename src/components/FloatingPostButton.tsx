import { useEffect, useState } from 'react';
import { PencilLine, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PostComposer } from './PostComposer';

export function FloatingPostButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  const shouldShow =
    pathname === '/'
    || pathname === '/games'
    || pathname.startsWith('/games/')
    || pathname.startsWith('/skills/');

  useEffect(() => {
    if (!shouldShow) setOpen(false);
  }, [shouldShow]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!shouldShow) return null;

  return (
    <>
      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2 rounded-full text-primary-foreground shadow-e3 px-3 py-3 md:px-4 transition-transform hover:-translate-y-[1px]"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgb(var(--brand-1)), rgb(var(--brand-2)), rgb(var(--brand-3)))',
          }}
          title="发表新帖子"
        >
          <div className="bg-primary/15 p-2 rounded-full flex-shrink-0">
            <PencilLine className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">发帖</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50"
          onMouseDown={() => setOpen(false)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" aria-hidden="true" />

          <div
            className="fixed left-4 right-4 top-24 bottom-4 ui-float-dialog overflow-auto md:left-auto md:top-auto md:bottom-20 md:right-4 md:w-card-md"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="发表新帖子"
          >
            <PostComposer
              className="bg-surface rounded-xl border border-border p-4 shadow-e3"
              headerRight={(
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-surface-2 text-muted-foreground hover:text-foreground"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}
