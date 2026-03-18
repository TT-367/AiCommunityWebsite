import { useEffect, useState } from 'react';
import { PencilLine, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PostComposer } from './PostComposer';

export function FloatingPostButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const shouldShow = location.pathname === '/';

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
          className="group flex items-center gap-2 rounded-full bg-black text-white shadow-xl px-3 py-3 md:px-4 transition-colors hover:bg-gray-800"
          title="发表新帖子"
        >
          <div className="bg-white/10 p-2 rounded-full flex-shrink-0">
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
          <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

          <div
            className="fixed left-4 right-4 top-24 bottom-4 max-h-[calc(100vh-7rem)] overflow-auto md:left-auto md:top-auto md:bottom-20 md:right-4 md:w-[420px] md:max-w-[calc(100vw-2rem)] md:max-h-[calc(100vh-6rem)]"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="发表新帖子"
          >
            <PostComposer
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xl"
              headerRight={(
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-gray-100 text-gray-700"
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
