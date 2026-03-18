import { useEffect, useMemo, useState } from 'react';
import { ThumbsUp, Users, Search, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';

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

export function GameGallery() {
  const navigate = useNavigate();

  const user = useAuthStore(s => s.user);
  const openModal = useAuthStore(s => s.openModal);

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
  const [tags, setTags] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('games')
        .select('id,owner_id,title,description,thumbnail_url,tags,play_count,likes,created_at,owner:profiles!games_owner_id_fkey(id,display_name,avatar_url)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (error || !data) {
        setLoadError(error?.message ?? '加载失败');
        setGames([]);
      } else {
        setGames((data as unknown as GameRow[] | null) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredGames = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return games;
    return games.filter(g =>
      g.title.toLowerCase().includes(s)
      || g.description.toLowerCase().includes(s)
      || (g.tags ?? []).some(t => String(t).toLowerCase().includes(s))
    );
  }, [games, q]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Navigation / Search Bar */}
        <div className="mb-4 flex items-center justify-end">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search games..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-300 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-xl md:text-3xl font-bold mb-2">AI Game Gallery</h1>
            <p className="text-purple-100 text-sm md:text-base mb-4">
              Explore innovative games created with AI technology. Play, rate, and get inspired by the community's creations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-white text-purple-600 hover:bg-purple-50 border-none font-semibold px-4 py-2 h-auto text-sm"
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
                Submit Your Game
              </Button>
              <Button variant="outline" className="border-purple-300 text-white hover:bg-purple-700/50 px-4 py-2 h-auto text-sm">
                How It Works
              </Button>
            </div>
          </div>
        </div>

        {/* Game Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-gray-500">加载中...</div>
        ) : loadError ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-red-600">加载失败：{loadError}</div>
        ) : filteredGames.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-gray-500">暂无游戏内容。</div>
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
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Top Thumbnail */}
              <div className="w-full aspect-video bg-gray-100 relative overflow-hidden flex-shrink-0">
                <img 
                  src={thumb} 
                  alt={game.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2" />
              </div>

              {/* Bottom Content */}
              <div className="p-4 flex flex-col z-10 bg-white relative flex-grow">
                {/* Developer Info & Stats */}
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
                    <span className="text-xs text-gray-600 truncate font-medium">{ownerName}</span>
                  </button>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
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
                
                {/* Title */}
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                  {game.title}
                </h3>
                
                {/* Expandable Description */}
                <div className="max-h-[1.2rem] group-hover:max-h-32 overflow-hidden transition-[max-height] duration-500 ease-in-out">
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {game.description}
                  </p>
                </div>

                <div className="mt-auto pt-2 flex flex-wrap gap-2">
                  {(game.tags ?? []).slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded-md">
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

        {submitOpen && (
          <div className="fixed inset-0 z-50" onMouseDown={() => setSubmitOpen(false)} aria-hidden="true">
            <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
            <div
              className="fixed left-4 right-4 top-24 bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-[560px] md:top-24 md:bottom-auto md:max-w-[calc(100vw-2rem)]"
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Submit Your Game"
            >
              <div className="bg-white rounded-xl border border-gray-100 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">Submit Your Game</div>
                  <button
                    type="button"
                    onClick={() => setSubmitOpen(false)}
                    className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-gray-100 text-gray-700"
                    title="关闭"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder="游戏名称"
                    disabled={submitting}
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[96px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder="游戏简介"
                    disabled={submitting}
                  />
                  <input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder="封面图链接（可选）"
                    disabled={submitting}
                  />
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder="标签（逗号分隔，可选）"
                    disabled={submitting}
                  />
                  {submitError && <div className="text-sm text-red-600">提交失败：{submitError}</div>}

                  <div className="flex items-center justify-end gap-2 pt-2">
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
                        setSubmitting(true);
                        setSubmitError(null);
                        try {
                          const tagList = tags
                            .split(',')
                            .map(t => t.trim())
                            .filter(Boolean)
                            .slice(0, 8);

                          const newId = `g-${crypto.randomUUID()}`;
                          const payload = {
                            id: newId,
                            owner_id: user.id,
                            title: title.trim(),
                            description: description.trim(),
                            thumbnail_url: thumbnailUrl.trim() || null,
                            tags: tagList,
                          };

                          const { error } = await supabase.from('games').insert(payload);
                          if (error) throw error;

                          const { data } = await supabase
                            .from('games')
                            .select('id,owner_id,title,description,thumbnail_url,tags,play_count,likes,created_at,owner:profiles!games_owner_id_fkey(id,display_name,avatar_url)')
                            .eq('id', newId)
                            .maybeSingle();
                          if (data) setGames(prev => [data as unknown as GameRow, ...prev]);
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
