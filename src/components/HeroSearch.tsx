import { useEffect, useRef, useState } from 'react';
import { Search, Hash } from 'lucide-react';
import { Button } from './ui/Button';
import { TagInput } from './TagInput';
import { supabase } from '../lib/supabaseClient';
import { getTagDisplayName } from '../lib/tags';
import { tagRegistrySeed } from '../data/tagRegistry';

export type HomeTab = 'hot' | 'latest' | 'skills' | 'games';

interface HeroSearchProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  selectedTags: string[];
  onSelectedTagsChange: (next: string[]) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
}

export function HeroSearch({ activeTab, onTabChange, selectedTags, onSelectedTagsChange, searchQuery, onSearchChange, onSearchSubmit }: HeroSearchProps) {
  const [tagOpen, setTagOpen] = useState(false);
  const tagRootRef = useRef<HTMLDivElement | null>(null);
  const [hotTags, setHotTags] = useState<Array<{ slug: string; displayName: string }>>(
    [...tagRegistrySeed]
      .sort((a, b) => (Number(b.weight ?? 0) - Number(a.weight ?? 0)) || a.displayName.localeCompare(b.displayName))
      .slice(0, 10)
      .map((t) => ({ slug: t.slug, displayName: t.displayName }))
  );
  const handleSelectedTagsChange = (next: string[]) => {
    const added = next.filter((s) => !selectedTags.includes(s));
    if (added.length > 0) {
      const names = added.map((s) => getTagDisplayName(s)).filter((n) => n && n.length > 0);
      if (names.length > 0) {
        const base = searchQuery.trim();
        const appended = `${base}${base ? ' ' : ''}${names.join(' ')}`.trim();
        onSearchChange(appended);
        if (activeTab !== 'hot' && activeTab !== 'latest') onTabChange('hot');
      }
    }
    onSelectedTagsChange(next);
  };

  useEffect(() => {
    if (!tagOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = tagRootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setTagOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [tagOpen]);

  useEffect(() => {
    if (!tagOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('slug,display_name,weight')
          .order('weight', { ascending: false })
          .order('display_name', { ascending: true })
          .limit(10);
        if (cancelled) return;
        if (error || !data) throw error || new Error('no data');
        const rows = (data ?? []).map((r) => ({ slug: String(r.slug), displayName: String(r.display_name) }));
        setHotTags(rows);
      } catch {
        if (cancelled) return;
        const rows = [...tagRegistrySeed]
          .sort((a, b) => (Number(b.weight ?? 0) - Number(a.weight ?? 0)) || a.displayName.localeCompare(b.displayName))
          .slice(0, 10)
          .map((t) => ({ slug: t.slug, displayName: t.displayName }));
        setHotTags(rows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tagOpen]);

  return (
    <div className="sticky top-[4.5rem] z-40 mb-4 ui-panel p-4 text-center relative overflow-visible backdrop-blur-sm bg-surface/92 supports-[backdrop-filter]:bg-surface/75">
      <div
        className="absolute top-0 left-0 w-full h-1 opacity-80"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgb(var(--brand-1)), rgb(var(--brand-2)), rgb(var(--brand-3)))',
        }}
      />
      
      <div className="mb-4 flex items-center justify-center gap-3">
        <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
          分享你的AI实践
        </h1>
      </div>

      <div ref={tagRootRef} className="max-w-xl mx-auto relative mb-4 group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-9 pr-20 py-2 bg-surface-2 border border-border rounded-full text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-e1 hover:bg-surface hover:shadow-e2"
          placeholder="搜索话题、帖子或用户..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearchSubmit();
            }
          }}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTagOpen(v => !v)}
            className="h-7 rounded-full px-3 text-muted-foreground hover:text-foreground hover:bg-surface-2 text-xs font-medium gap-1"
          >
            <Hash className="w-3 h-3" /> 标签
          </Button>
        </div>

        {tagOpen && (
          <div
            className="absolute left-0 right-0 top-full mt-2 z-50 ui-popover p-4 text-left overflow-visible"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">热门标签</div>
              {hotTags.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/70">暂无热门标签</div>
              ) : (
                <div className="flex flex-wrap gap-2 min-h-[28px]">
                  {hotTags.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      className="px-2 py-1 rounded-md border border-border bg-surface-2 text-[11px] text-foreground hover:bg-surface"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedTags.includes(t.slug)) return;
                        handleSelectedTagsChange([...selectedTags, t.slug]);
                      }}
                      aria-label={`选择标签 ${getTagDisplayName(t.slug)}`}
                    >
                      {getTagDisplayName(t.slug)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <TagInput value={selectedTags} onChange={handleSelectedTagsChange} />
            {selectedTags.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">已选 {selectedTags.length} 个</div>
                <button
                  type="button"
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                  onClick={() => onSelectedTagsChange([])}
                >
                  清空
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center gap-5 md:gap-8 text-sm md:text-base font-medium text-muted-foreground">
            <button
          className={
            activeTab === 'hot'
              ? "text-primary relative after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-0.5 after:bg-primary font-bold whitespace-nowrap px-2"
              : "hover:text-foreground transition-colors whitespace-nowrap px-2"
          }
          onClick={() => onTabChange('hot')}
          type="button"
        >
          热门
        </button>
            <button
          className={
            activeTab === 'latest'
              ? "text-primary relative after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-0.5 after:bg-primary font-bold whitespace-nowrap px-2"
              : "hover:text-foreground transition-colors whitespace-nowrap px-2"
          }
          onClick={() => onTabChange('latest')}
          type="button"
        >
          最新
        </button>
            <button
          className={
            activeTab === 'skills'
              ? "text-primary relative after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-0.5 after:bg-primary font-bold whitespace-nowrap px-2"
              : "hover:text-foreground transition-colors whitespace-nowrap px-2"
          }
          onClick={() => onTabChange('skills')}
          type="button"
        >
          技能市场
        </button>
            <button
          className={
            activeTab === 'games'
              ? "text-primary relative after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-0.5 after:bg-primary font-bold whitespace-nowrap px-2"
              : "hover:text-foreground transition-colors whitespace-nowrap px-2"
          }
          onClick={() => onTabChange('games')}
          type="button"
        >
          游戏Demo
        </button>
      </div>
      </div>
      </div>
    </div>
  );
}
