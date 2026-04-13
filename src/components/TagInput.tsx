import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getTagDisplayName, suggestTags, type TagSuggestion } from '../lib/tags';

export function TagInput(props: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { value, onChange, disabled, placeholder } = props;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => new Set(value), [value]);
  const trimmed = query.trim();

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const res = await suggestTags(trimmed, 8);
      if (cancelled) return;
      const filtered = res.filter((s) => !selected.has(s.slug));
      setSuggestions(filtered);
      setActiveIdx(0);
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, selected, trimmed]);

  const add = (slug: string) => {
    if (selected.has(slug)) return;
    onChange([...value, slug]);
    setQuery('');
    setOpen(false);
  };

  const remove = (slug: string) => {
    onChange(value.filter((t) => t !== slug));
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`min-h-10 w-full rounded-lg border bg-surface px-2 py-2 flex flex-wrap gap-2 items-center ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'border-border hover:border-border-strong'
        }`}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
        }}
      >
        {value.map((slug) => (
          <span key={slug} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-1 text-xs font-bold text-foreground">
            <span className="max-w-text-md truncate">{getTagDisplayName(slug)}</span>
            <button
              type="button"
              className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-surface"
              onClick={(e) => {
                e.stopPropagation();
                if (disabled) return;
                remove(slug);
              }}
              aria-label="移除标签"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </span>
        ))}

        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((v) => Math.min(v + 1, Math.max(0, suggestions.length - 1)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((v) => Math.max(0, v - 1));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              if (suggestions.length > 0) {
                e.preventDefault();
                const pick = suggestions[Math.max(0, Math.min(activeIdx, suggestions.length - 1))];
                if (pick) add(pick.slug);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            } else if (e.key === 'Backspace' && query.length === 0 && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          disabled={disabled}
          placeholder={value.length === 0 ? (placeholder ?? '输入几个字母选择标签…') : ''}
          className="flex-1 min-w-[160px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground px-1"
        />
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-border bg-surface shadow-e2 overflow-hidden z-50">
          {trimmed.length < 2 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">输入 2 个以上字符以联想标签</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">无匹配标签</div>
          ) : (
            <div className="max-h-56 overflow-auto">
              {suggestions.map((s, idx) => (
                <button
                  key={s.slug}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-surface-2 transition-colors ${
                    idx === activeIdx ? 'bg-surface-2' : ''
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => add(s.slug)}
                >
                  <div className="text-sm font-bold text-foreground">{s.displayName}</div>
                  <div className="text-xs text-muted-foreground">{s.slug}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
