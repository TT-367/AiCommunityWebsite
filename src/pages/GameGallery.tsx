import { useEffect, useMemo, useState } from 'react';
import { ThumbsUp, Users, Search, Plus, Flame } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useAuthStore } from '../stores/authStore';
import { uploadImage } from '../lib/storage';
import { apiCreateGame, apiGetGames } from '../lib/apiClient';
import { mockGames } from '../data/mock';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type GameRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  tags: string[];
  play_count: number;
  likes: number;
  created_at: string;
  owner: ProfileRow | ProfileRow[] | null;
};

const normalizeProfile = (input: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null => {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  return input;
};

export function GameGallery(props?: { embedded?: boolean }) {
  const embedded = props?.embedded ?? false;
  const navigate = useNavigate();

  const user = useAuthStore(s => s.user);
  const openModal = useAuthStore(s => s.openModal);
  const session = useAuthStore(s => s.session);

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [tags, setTags] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiGetGames({ limit: 200 });
        if (cancelled) return;
        setGames((res.data as unknown as GameRow[] | null) ?? []);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : '加载失败');
        setGames([]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const baseGames = useMemo(() => {
    if (games.length > 0) return games;
    return mockGames.map(g => ({
      id: g.id,
      owner_id: g.author.id,
      title: g.title,
      description: g.description,
      thumbnail_url: g.thumbnail,
      tags: g.tags,
      play_count: g.playCount,
      likes: g.likes,
      created_at: g.createdAt,
      owner: { id: g.author.id, display_name: g.author.name, avatar_url: g.author.avatar },
    })) as GameRow[];
  }, [games]);

  const filteredGames = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return baseGames;
    return baseGames.filter(g =>
      g.title.toLowerCase().includes(s)
      || g.description.toLowerCase().includes(s)
      || (g.tags ?? []).some(t => String(t).toLowerCase().includes(s))
    );
  }, [baseGames, q]);

  const hotIdSet = useMemo(() => {
    const top = [...filteredGames]
      .sort((a, b) => (b.likes - a.likes) || (b.play_count - a.play_count))
      .slice(0, 5);
    return new Set(top.map(g => g.id));
  }, [filteredGames]);

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-background"}>
      <div className={embedded ? "space-y-4" : "container mx-auto px-4 py-6 max-w-7xl"}>
        <div className="bg-surface rounded-xl border border-border shadow-e1 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">AIGame Demo</h2>
            <p className="text-sm text-muted-foreground mt-1">提交并展示你的 AI 游戏 Demo，与社区交流并获得反馈。</p>
          </div>
          <Button
            className="shrink-0"
            onClick={() => {
              if (!user) {
                openModal('signIn');
                return;
              }
              setSubmitOpen(true);
              setSubmitError(null);
              setTitle('');
              setDescription('');
              setThumbnailUrl('');
              setTags('');
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            提交游戏
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-end">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="搜索游戏..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-input rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {loading ? (
          <div className="bg-surface rounded-xl border border-border shadow-e1 p-6 text-sm text-muted-foreground">加载中...</div>
        ) : loadError ? (
          <div className="bg-surface rounded-xl border border-border shadow-e1 p-6 text-sm text-destructive">加载失败：{loadError}</div>
        ) : filteredGames.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border shadow-e1 p-6 text-sm text-muted-foreground">暂无游戏内容。</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredGames.map(game => {
            const owner = normalizeProfile(game.owner);
            const ownerId = owner?.id ?? game.owner_id;
            const ownerName = owner?.display_name ?? `User ${String(ownerId).slice(0, 4)}`;
            const ownerAvatar = owner?.avatar_url
              ? String(owner.avatar_url)
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerId || game.id}`;
            const thumb = game.thumbnail_url ?? '/default-game.svg';

            return (
            <Link
              key={game.id}
              to={`/games/${game.id}`}
              className="bg-surface rounded-xl border border-border shadow-e1 overflow-hidden hover:shadow-e2 hover:border-primary/20 transition-all group flex flex-col"
            >
              <div className="w-full aspect-video bg-surface-2 relative overflow-hidden flex-shrink-0">
                {hotIdSet.has(game.id) && (
                  <div className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/10 border border-warning/20 text-warning">
                    <Flame className="w-4 h-4" />
                  </div>
                )}
                <img
                  src={thumb}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = '1';
                      img.src = '/mock/games/pixel-fallback.svg';
                    }
                  }}
                />
                <div className="absolute top-2 right-2" />
              </div>

              <div className="p-4 flex flex-col z-10 bg-surface relative flex-grow">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 min-w-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/user/${ownerId}`);
                    }}
                    aria-label={`查看 ${ownerName} 的主页`}
                  >
                    <Avatar src={ownerAvatar} alt={ownerName} size="sm" className="w-6 h-6" />
                    <span className="text-xs text-muted-foreground truncate font-medium">{ownerName}</span>
                  </button>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1" title="Views">
                      <Users className="w-3.5 h-3.5" />
                      <span>{Number(game.play_count ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Likes">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{Number(game.likes ?? 0)}</span>
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {game.title}
                </h3>

                <div className="max-h-[1.2rem] group-hover:max-h-32 overflow-hidden transition-[max-height] duration-500 ease-in-out">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {game.description}
                  </p>
                </div>

                <div className="mt-auto pt-2 flex flex-wrap gap-2">
                  {(game.tags ?? []).slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-1 bg-surface-2 text-muted-foreground rounded-md border border-border/50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
            );
          })}
        </div>
        )}

        <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
          <DialogContent className="max-w-dialog-md">
            <DialogHeader>
              <DialogTitle>Submit Your Game</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="游戏名称"
                disabled={submitting}
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[96px]"
                placeholder="游戏简介"
                disabled={submitting}
              />
              <div className="space-y-2">
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="封面图链接（可选）"
                  disabled={submitting || thumbnailUploading}
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submitting || thumbnailUploading}
                    onClick={() => {
                      const el = document.getElementById('game-thumbnail-file') as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                    {thumbnailUploading ? '上传中...' : '上传封面图片'}
                  </Button>
                  <div className="text-xs text-muted-foreground">上传后自动填入 链接</div>
                </div>
                <input
                  id="game-thumbnail-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    if (!user) {
                      openModal('signIn');
                      return;
                    }
                    setThumbnailUploading(true);
                    setSubmitError(null);
                    try {
                      const url = await uploadImage(file, `games/${user.id}`);
                      setThumbnailUrl(url);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : '上传失败';
                      setSubmitError(msg);
                    } finally {
                      setThumbnailUploading(false);
                    }
                  }}
                />
              </div>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="标签（逗号分隔，可选）"
                disabled={submitting}
              />
              {submitError && <div className="text-sm text-destructive">提交失败：{submitError}</div>}
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSubmitOpen(false)} disabled={submitting}>
                取消
              </Button>
              <Button
                disabled={submitting || title.trim().length === 0 || description.trim().length === 0}
                onClick={async () => {
                  if (!user) {
                    openModal('signIn');
                    return;
                  }
                  const accessToken = session?.access_token;
                  if (!accessToken) {
                    openModal('signIn');
                    return;
                  }
                  setSubmitting(true);
                  setSubmitError(null);
                  try {
                    const tagList = tags
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean)
                      .slice(0, 8);

                    const newId = `g-${crypto.randomUUID()}`;
                    const res = await apiCreateGame({
                      accessToken,
                      id: newId,
                      title: title.trim(),
                      description: description.trim(),
                      thumbnailUrl: thumbnailUrl.trim() || null,
                      tags: tagList,
                    });
                    const row = res.data as unknown as GameRow | null;
                    if (row) setGames(prev => [row, ...prev]);
                    setSubmitOpen(false);
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : '提交失败';
                    setSubmitError(msg);
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                提交
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
