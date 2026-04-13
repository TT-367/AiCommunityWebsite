import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Flame, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabaseClient';
import { mockSkills } from '../data/mock';
import { mockPosts } from '../data/mock';
import { FORCE_MOCK_POSTS } from '../config/featureFlags';
import { canonicalizeTags, getTagDisplayName } from '../lib/tags';
import { engineNameToTags, toolIdToTags } from '../data/toolchainTagMap';
import { toolLogoFallbackUrl } from '../lib/toolLogos';

type Tool = {
  id: string;
  name: string;
  logo: string;
  url: string;
  description: string;
  engine?: string[];
  relatedPromptIds?: string[];
  relatedSkillIds?: string[];
};

type RelatedPost = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  likesCount: number;
};

export function ToolDetailDialog({
  open,
  onOpenChange,
  tool,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: Tool | null;
}) {
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const toolTags = useMemo(() => {
    if (!tool) return [] as string[];
    const base = new Set<string>();
    for (const t of toolIdToTags[tool.id] ?? []) base.add(t);
    for (const eng of tool.engine ?? []) {
      for (const t of engineNameToTags[eng] ?? []) base.add(t);
    }
    const merged = Array.from(base);
    return merged;
  }, [tool]);

  const relatedSkills = useMemo(() => {
    if (!tool) return [];
    
    // 1. 优先获取硬关联的 Skills
    const explicit = tool.relatedSkillIds 
      ? mockSkills.filter(s => tool.relatedSkillIds!.includes(s.id))
      : [];
    
    // 2. 补充标签关联的 Skills
    const tagBased = mockSkills
      .filter(s => !explicit.some(e => e.id === s.id)) // 排除已在 explicit 中的
      .map((s) => {
        const slugs = canonicalizeTags((s.tags ?? []).map((t) => String(t)));
        const overlap = slugs.filter((t) => toolTags.includes(t)).length;
        return { s, overlap };
      })
      .filter((x) => x.overlap > 0)
      .sort((a, b) => (b.overlap !== a.overlap ? b.overlap - a.overlap : b.s.likes - a.s.likes))
      .map((x) => x.s);
      
    return [...explicit, ...tagBased].slice(0, 6);
  }, [tool, toolTags]);

  useEffect(() => {
    if (!open || !tool) return;
    let cancelled = false;

    (async () => {
      setPostsLoading(true);
      try {
        if (FORCE_MOCK_POSTS) throw new Error('mock_only');
        const { data, error } = await supabase
          .from('posts')
          .select('id,title,description,tags,created_at,post_likes(count)')
          .order('created_at', { ascending: false })
          .limit(80);

        if (cancelled) return;
        if (error || !data) throw new Error(error?.message ?? '加载失败');

        const rows = (data as unknown as Array<Record<string, unknown>>).map((r) => {
          const id = String(r.id ?? '');
          const title = String(r.title ?? '');
          const description = String(r.description ?? '');
          const created_at = String(r.created_at ?? '');
          const tags = Array.isArray(r.tags) ? r.tags.map((t) => String(t)) : [];
          const likesCountRaw =
            Array.isArray((r as { post_likes?: Array<{ count?: unknown }> }).post_likes)
              ? (r as { post_likes?: Array<{ count?: unknown }> }).post_likes?.[0]?.count
              : 0;
          const likesCount = typeof likesCountRaw === 'number' ? likesCountRaw : Number(likesCountRaw ?? 0);
          return { id, title, description, tags, created_at, likesCount } satisfies RelatedPost;
        });

        const scored = rows
          .map((p) => {
            const slugs = canonicalizeTags(p.tags);
            const overlap = slugs.filter((t) => toolTags.includes(t)).length;
            return { p, overlap };
          })
          .filter((x) => x.overlap > 0)
          .sort((a, b) => (b.overlap !== a.overlap ? b.overlap - a.overlap : b.p.likesCount - a.p.likesCount))
          .slice(0, 5)
          .map((x) => x.p);

        setRelatedPosts(scored);
        setPostsLoading(false);
      } catch {
        if (cancelled) return;
        const fallback = mockPosts
          .map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            tags: p.tags,
            created_at: p.createdAt,
            likesCount: p.likes,
          }))
          .map((p) => {
            const slugs = canonicalizeTags(p.tags);
            const overlap = slugs.filter((t) => toolTags.includes(t)).length;
            return { p, overlap };
          })
          .filter((x) => x.overlap > 0)
          .sort((a, b) => (b.overlap !== a.overlap ? b.overlap - a.overlap : b.p.likesCount - a.p.likesCount))
          .slice(0, 5)
          .map((x) => x.p);

        setRelatedPosts(fallback);
        setPostsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tool, toolTags]);

  const safeUrl = tool?.url && tool.url !== '#' ? tool.url : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-dialog-lg" overlayClassName="bg-background/50 backdrop-blur-sm">
        <DialogHeader className="pr-10">
          <DialogTitle className="flex items-center gap-3">
            {tool && (
              <span className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center p-2">
                <img
                  src={tool.logo}
                  alt={tool.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === '1') return;
                    img.dataset.fallbackApplied = '1';
                    img.src = toolLogoFallbackUrl();
                  }}
                />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-lg font-extrabold text-foreground truncate">{tool?.name ?? ''}</span>
              <span className="block text-xs text-muted-foreground mt-1 line-clamp-1">{tool?.description ?? ''}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {toolTags.slice(0, 8).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-surface-2 border border-border text-muted-foreground">
                <Tag className="w-3 h-3" />
                {getTagDisplayName(t)}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface-2/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm font-bold text-foreground">论坛热帖</div>
                {toolTags.length > 0 && (
                  <Link
                    to={`/?tab=hot&tags=${encodeURIComponent(tool?.id ?? '')}&q=${encodeURIComponent(tool?.name ?? '')}`}
                    className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new Event('toolchain:close'));
                    }}
                  >
                    查看更多
                  </Link>
                )}
              </div>
              <div className="space-y-3">
                {postsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
                  ))
                ) : relatedPosts.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">暂无相关热帖</div>
                ) : (
                  relatedPosts.map((post) => (
                    <Link
                      key={post.id}
                      to={`/post/${post.id}`}
                      className="group/item flex flex-col gap-1 p-2 rounded-lg hover:bg-surface transition-colors"
                      onClick={() => onOpenChange(false)}
                    >
                      <div className="text-xs font-bold text-foreground group-hover/item:text-primary truncate">
                        {post.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> {post.likesCount}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-2/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm font-bold text-foreground">技能市场 / Prompt</div>
                {toolTags.length > 0 && (
                  <Link
                    to={`/?tab=skills&tags=${encodeURIComponent(tool?.id ?? '')}&q=${encodeURIComponent(tool?.name ?? '')}`}
                    className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new Event('toolchain:close'));
                    }}
                  >
                    查看更多
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                {relatedSkills.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">暂无相关技能</div>
                ) : (
                  relatedSkills.map((s) => (
                    <Link
                      key={s.id}
                      to={`/skills/${s.id}`}
                      className="group/item flex flex-col gap-1 p-2 rounded-lg hover:bg-surface transition-colors"
                      onClick={() => onOpenChange(false)}
                    >
                      <div className="text-xs font-bold text-foreground group-hover/item:text-primary truncate">
                        {s.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {s.description}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button
            onClick={() => {
              if (!safeUrl) return;
              window.open(safeUrl, '_blank', 'noopener,noreferrer');
            }}
            disabled={!safeUrl}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            跳转官网
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
