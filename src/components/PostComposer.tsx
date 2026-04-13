import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui/Button';
import { mockSkills, mockGames } from '../data/mock';
import { addLocalPost } from '../data/localPostsStore';
import { FORCE_MOCK_POSTS } from '../config/featureFlags';
import { TagInput } from './TagInput';

interface PostComposerProps {
  className?: string;
  headerRight?: ReactNode;
}

export function PostComposer({ className, headerRight }: PostComposerProps) {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const openModal = useAuthStore(s => s.openModal);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagSlugs, setTagSlugs] = useState<string[]>([]);
  const [bindSkillEnabled, setBindSkillEnabled] = useState(false);
  const [bindGameEnabled, setBindGameEnabled] = useState(false);
  const [skillQuery, setSkillQuery] = useState('');
  const [gameQuery, setGameQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [remoteGames, setRemoteGames] = useState<Array<{ id: string; title: string; description: string; thumbnailUrl: string | null }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bindGameEnabled) return;
    if (FORCE_MOCK_POSTS) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('games')
        .select('id,title,description,thumbnail_url')
        .order('created_at', { ascending: false })
        .limit(80);
      if (cancelled) return;
      const rows = (data as unknown as Array<{ id: string; title: string; description: string; thumbnail_url: string | null }> | null) ?? [];
      setRemoteGames(rows.map(r => ({ id: r.id, title: r.title, description: r.description, thumbnailUrl: r.thumbnail_url })));
    })();
    return () => {
      cancelled = true;
    };
  }, [bindGameEnabled]);

  const selectedSkill = useMemo(() => mockSkills.find(s => s.id === selectedSkillId) ?? null, [selectedSkillId]);
  const selectedGame = useMemo(() => {
    const fromRemote = remoteGames.find(g => g.id === selectedGameId);
    if (fromRemote) return { id: fromRemote.id, title: fromRemote.title, description: fromRemote.description };
    const fromMock = mockGames.find(g => g.id === selectedGameId);
    if (fromMock) return { id: fromMock.id, title: fromMock.title, description: fromMock.description };
    return null;
  }, [remoteGames, selectedGameId]);

  const skillResults = useMemo(() => {
    if (!bindSkillEnabled) return [];
    const q = skillQuery.trim().toLowerCase();
    if (!q) return mockSkills.slice(0, 8);
    return mockSkills
      .filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => String(t).toLowerCase().includes(q)))
      .slice(0, 8);
  }, [bindSkillEnabled, skillQuery]);

  const allGames = useMemo(() => {
    const fromRemote = remoteGames.map(g => ({ id: g.id, title: g.title, description: g.description }));
    const fromMock = mockGames.map(g => ({ id: g.id, title: g.title, description: g.description }));
    const byId = new Map<string, { id: string; title: string; description: string }>();
    for (const g of [...fromRemote, ...fromMock]) byId.set(g.id, g);
    return Array.from(byId.values());
  }, [remoteGames]);

  const gameResults = useMemo(() => {
    if (!bindGameEnabled) return [];
    const q = gameQuery.trim().toLowerCase();
    const base = allGames;
    if (!q) return base.slice(0, 8);
    return base
      .filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allGames, bindGameEnabled, gameQuery]);

  return (
    <div className={className ?? 'bg-surface rounded-xl border border-border p-5 shadow-e1'}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-foreground">发表新帖子</div>
        <div className="flex items-center gap-2">
          {!user && (
            <Button variant="secondary" size="sm" onClick={() => openModal('signIn')}>
              登录后发布
            </Button>
          )}
          {headerRight}
        </div>
      </div>

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="标题"
          disabled={!user || submitting}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[120px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="正文（支持 Markdown）"
          disabled={!user || submitting}
        />
        <TagInput
          value={tagSlugs}
          onChange={setTagSlugs}
          disabled={!user || submitting}
          placeholder="标签（输入几个字母联想，比如 urp / shader / netcode）"
        />

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="text-sm font-semibold text-foreground">关联分享（可选）</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBindSkillEnabled(v => !v);
                if (bindSkillEnabled) {
                  setSelectedSkillId(null);
                  setSkillQuery('');
                }
              }}
              className={bindSkillEnabled ? 'px-3 py-1.5 rounded-full text-xs font-bold border border-primary/25 bg-primary/10 text-primary' : 'px-3 py-1.5 rounded-full text-xs font-bold border border-border bg-surface text-muted-foreground hover:bg-surface'}
              disabled={!user || submitting}
            >
              关联技能
            </button>
            <button
              type="button"
              onClick={() => {
                setBindGameEnabled(v => !v);
                if (bindGameEnabled) {
                  setSelectedGameId(null);
                  setGameQuery('');
                }
              }}
              className={bindGameEnabled ? 'px-3 py-1.5 rounded-full text-xs font-bold border border-primary/25 bg-primary/10 text-primary' : 'px-3 py-1.5 rounded-full text-xs font-bold border border-border bg-surface text-muted-foreground hover:bg-surface'}
              disabled={!user || submitting}
            >
              关联游戏Demo
            </button>
          </div>

          {bindSkillEnabled && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1">搜索技能市场</div>
              <input
                value={skillQuery}
                onChange={(e) => setSkillQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="搜索技能标题/标签..."
                disabled={!user || submitting}
              />
              {selectedSkill ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{selectedSkill.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{selectedSkill.description}</div>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-bold text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedSkillId(null)}
                    disabled={!user || submitting}
                  >
                    移除
                  </button>
                </div>
              ) : (
                <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-border bg-surface">
                  {skillResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">无匹配技能</div>
                  ) : (
                    skillResults.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSkillId(s.id)}
                        className="w-full px-3 py-2 text-left hover:bg-surface-2 border-b border-border last:border-b-0"
                        disabled={!user || submitting}
                      >
                        <div className="text-sm font-semibold text-foreground">{s.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {bindGameEnabled && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1">搜索游戏Demo</div>
              <input
                value={gameQuery}
                onChange={(e) => setGameQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="搜索游戏标题..."
                disabled={!user || submitting}
              />
              {selectedGame ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{selectedGame.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{selectedGame.description}</div>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-bold text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedGameId(null)}
                    disabled={!user || submitting}
                  >
                    移除
                  </button>
                </div>
              ) : (
                <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-border bg-surface">
                  {gameResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">无匹配游戏</div>
                  ) : (
                    gameResults.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGameId(g.id)}
                        className="w-full px-3 py-2 text-left hover:bg-surface-2 border-b border-border last:border-b-0"
                        disabled={!user || submitting}
                      >
                        <div className="text-sm font-semibold text-foreground">{g.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{g.description}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex justify-end">
          <Button
            disabled={!user || submitting || title.trim().length === 0 || content.trim().length === 0}
            onClick={async () => {
              if (!user) {
                openModal('signIn');
                return;
              }

              setSubmitting(true);
              setError(null);
              try {
                const tagList = tagSlugs.map((t) => t.trim()).filter(Boolean).slice(0, 8);

                let finalContent = content;
                if (selectedSkill || selectedGame) {
                  const lines: string[] = [];
                  lines.push('---');
                  lines.push('');
                  lines.push('## 关联分享');
                  if (selectedSkill) lines.push(`- 技能：**${selectedSkill.title}**（/skills/${selectedSkill.id}）`);
                  if (selectedGame) lines.push(`- 游戏Demo：**${selectedGame.title}**（/games/${selectedGame.id}）`);
                  finalContent = `${content.trim()}\n\n${lines.join('\n')}\n`;
                }

                const description = finalContent.replace(/\s+/g, ' ').trim().slice(0, 160);

                if (FORCE_MOCK_POSTS) {
                  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
                  const displayName = typeof meta.display_name === 'string' ? meta.display_name : '';
                  const authorId = user.id;
                  const author = {
                    id: authorId,
                    name: displayName || user.email || '用户',
                    handle: `@${authorId.slice(0, 6)}`,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`,
                  };
                  const created = addLocalPost({
                    title: title.trim(),
                    content: finalContent,
                    tags: tagList,
                    author,
                  });
                  window.dispatchEvent(new Event('posts:refresh'));
                  navigate(`/post/${created.id}`);
                  return;
                }

                const { data, error } = await supabase
                  .from('posts')
                  .insert({
                    author_id: user.id,
                    title: title.trim(),
                    content: finalContent,
                    description,
                    tags: tagList,
                  })
                  .select('id')
                  .single();

                if (error) throw error;

                setTitle('');
                setContent('');
                setTagSlugs([]);
                setBindSkillEnabled(false);
                setBindGameEnabled(false);
                setSelectedSkillId(null);
                setSelectedGameId(null);
                setSkillQuery('');
                setGameQuery('');

                window.dispatchEvent(new Event('posts:refresh'));
                if (data?.id) navigate(`/post/${data.id}`);
              } catch {
                setError('发布失败');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            发布
          </Button>
        </div>
      </div>
    </div>
  );
}
