import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Link as LinkIcon, Send, ThumbsUp, Users } from 'lucide-react';
import { mockGames } from '../data/mock';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { apiCreateGameComment, apiGetGameComments, apiGetLikedGameCommentIds, apiToggleGameCommentLike } from '../lib/apiClient';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type GamePostRow = {
  game_id: string;
  author_id: string;
  author_note: string;
  video_url: string | null;
  repo_url: string | null;
  created_at: string;
  updated_at: string;
  author: ProfileRow | ProfileRow[] | null;
};

type CountRow = { count: number };

type GameCommentRow = {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: ProfileRow | ProfileRow[] | null;
  game_comment_likes?: CountRow[];
};

type GameComment = {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: ProfileRow | ProfileRow[] | null;
  likesCount: number;
  viewerHasLiked: boolean;
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

const getEmbedUrl = (url: string) => {
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    if (host.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host.includes('bilibili.com')) {
      const bvid = u.pathname.split('/').find((p) => /^BV/.test(p));
      if (bvid) return `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0`;
    }
  } catch {
    return null;
  }
  return null;
};

export function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ?? '';
  const fallbackGame = useMemo(() => mockGames.find(g => g.id === id), [id]);
  const [game, setGame] = useState<GameRow | null>(null);
  const [loadingGame, setLoadingGame] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);

  const { user, session, openModal } = useAuthStore();

  const [loadingShare, setLoadingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [gamePost, setGamePost] = useState<GamePostRow | null>(null);

  const [creatingShare, setCreatingShare] = useState(false);
  const [authorNoteDraft, setAuthorNoteDraft] = useState('');
  const [videoUrlDraft, setVideoUrlDraft] = useState('');
  const [repoUrlDraft, setRepoUrlDraft] = useState('');

  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [comments, setComments] = useState<GameComment[]>([]);
  const [commentsRefreshNonce, setCommentsRefreshNonce] = useState(0);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; label: string } | null>(null);
  const [commentLikeBusy, setCommentLikeBusy] = useState<string | null>(null);

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => (prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]));
  };

  useEffect(() => {
    setCreatingShare(false);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    (async () => {
      setLoadingGame(true);
      setGameError(null);
      const { data, error } = await supabase
        .from('games')
        .select('id,owner_id,title,description,thumbnail_url,tags,play_count,likes,created_at,owner:profiles!games_owner_id_fkey(id,display_name,avatar_url)')
        .eq('id', gameId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setGameError(error.message);
        setGame(null);
      } else {
        setGame((data as unknown as GameRow | null) ?? null);
      }
      setLoadingGame(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    (async () => {
      setLoadingShare(true);
      setShareError(null);

      const { data, error } = await supabase
        .from('game_posts')
        .select('game_id,author_id,author_note,video_url,repo_url,created_at,updated_at,author:profiles!game_posts_author_id_fkey(id,display_name,avatar_url)')
        .eq('game_id', gameId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setShareError(error.message);
        setGamePost(null);
      } else {
        setGamePost((data as unknown as GamePostRow | null) ?? null);
      }
      setLoadingShare(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    (async () => {
      setLoadingComments(true);
      setCommentsError(null);
      try {
        const accessToken = session?.access_token ?? null;
        const res = await apiGetGameComments({ gameId, accessToken });
        if (cancelled) return;
        const rows = (res.data as unknown as GameCommentRow[] | null) ?? [];
        const base = rows.map((r) => {
          const likesCount = r.game_comment_likes?.[0]?.count ?? 0;
          return {
            id: r.id,
            parent_id: r.parent_id,
            content: r.content,
            created_at: r.created_at,
            author: r.author,
            likesCount: Number(likesCount),
            viewerHasLiked: false,
          } satisfies GameComment;
        });

        if (accessToken && base.length > 0) {
          const likedRes = await apiGetLikedGameCommentIds({ accessToken, commentIds: base.map((c) => c.id) });
          if (cancelled) return;
          const likedSet = new Set((likedRes.data ?? []).map((x) => String(x)));
          setComments(base.map((c) => ({ ...c, viewerHasLiked: likedSet.has(c.id) })));
        } else {
          setComments(base);
        }
      } catch (e) {
        if (cancelled) return;
        setComments([]);
        setCommentsError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [commentsRefreshNonce, gameId, session?.access_token]);

  const shareAuthor = useMemo(() => normalizeProfile(gamePost?.author), [gamePost]);
  const shareAuthorId = shareAuthor?.id ?? gamePost?.author_id ?? '';
  const shareAuthorName = shareAuthor?.display_name ?? (shareAuthorId ? `User ${shareAuthorId.slice(0, 4)}` : '');
  const shareAuthorAvatar = shareAuthor?.avatar_url
    ? String(shareAuthor.avatar_url)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${shareAuthorId || gameId}`;

  const ownerProfile = useMemo(() => normalizeProfile(game?.owner), [game]);
  const ownerId = ownerProfile?.id ?? game?.owner_id ?? '';
  const ownerName = ownerProfile?.display_name
    ?? (ownerId ? `User ${ownerId.slice(0, 4)}` : (fallbackGame?.author.name ?? ''));
  const ownerAvatar = ownerProfile?.avatar_url
    ? String(ownerProfile.avatar_url)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerId || fallbackGame?.author.id || gameId}`;
  const isOwner = Boolean(user && game && user.id === game.owner_id);

  const canEditShare = Boolean(user && game && gamePost && user.id === gamePost.author_id && isOwner);
  const canCreateShare = Boolean(user && game && !gamePost && isOwner);

  const embedUrl = useMemo(() => (gamePost?.video_url ? getEmbedUrl(gamePost.video_url) : null), [gamePost?.video_url]);
  const commentTree = useMemo(() => {
    const roots: GameComment[] = [];
    const replies = new Map<string, GameComment[]>();
    for (const c of comments) {
      if (!c.parent_id) roots.push(c);
      else {
        const list = replies.get(c.parent_id) ?? [];
        list.push(c);
        replies.set(c.parent_id, list);
      }
    }
    roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const [, list] of replies) {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return { roots, replies };
  }, [comments]);

  if (!game && !fallbackGame && !loadingGame) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-foreground">Game not found</h2>
        <Link to="/games" className="text-primary hover:underline mt-4 inline-block">
          Return to Gallery
        </Link>
      </div>
    );
  }

  const title = game?.title ?? fallbackGame?.title ?? '';
  const description = game?.description ?? fallbackGame?.description ?? '';
  const thumbnail = game?.thumbnail_url
    ?? fallbackGame?.thumbnail
    ?? '/default-game.svg';
  const tags = (game?.tags ?? fallbackGame?.tags ?? []) as string[];
  const playCount = Number(game?.play_count ?? fallbackGame?.playCount ?? 0);
  const likes = Number(game?.likes ?? fallbackGame?.likes ?? 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/games" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回展馆
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{playCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{likes}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-surface rounded-xl border border-border shadow-e1 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{title}</h1>
                  <p className="text-muted-foreground leading-relaxed">{description}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar src={ownerAvatar} alt={ownerName} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{ownerName}</div>
                      <div className="text-xs text-muted-foreground truncate">@{(ownerId || fallbackGame?.author.id || gameId).slice(0, 6)}</div>
                    </div>
                    {loadingGame && <span className="text-xs text-muted-foreground/70">加载中...</span>}
                    {gameError && <span className="text-xs text-destructive">{gameError}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2.5 py-1 bg-surface-2 text-muted-foreground rounded-md border border-border">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-32 h-20 bg-surface-2 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                  <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-foreground mb-3">分享</div>

                {loadingShare ? (
                  <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">加载中...</div>
                ) : gamePost ? (
                  <div className="rounded-xl border border-border bg-surface-2 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex items-center gap-3">
                        <Avatar src={shareAuthorAvatar} alt={shareAuthorName} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{shareAuthorName}</div>
                          <div className="text-xs text-muted-foreground truncate">@{shareAuthorId.slice(0, 6)}</div>
                        </div>
                      </div>
                      {canEditShare && (
                        <Badge variant="secondary" className="bg-surface border border-border text-muted-foreground">你发布的分享</Badge>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap">{gamePost.author_note}</div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-surface overflow-hidden">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">视频</div>
                        <div className="aspect-video bg-surface-2">
                          {gamePost.video_url ? (
                            embedUrl ? (
                              <iframe
                                title="game video"
                                src={embedUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground px-4">
                                暂不支持该视频链接预览，点击右侧按钮打开
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">未提供视频链接</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-surface overflow-hidden">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">代码库</div>
                        <div className="p-3">
                          {gamePost.repo_url ? (
                            <a
                              href={gamePost.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <LinkIcon className="w-4 h-4" />
                              <span className="truncate max-w-text-xl">{gamePost.repo_url}</span>
                            </a>
                          ) : (
                            <div className="text-sm text-muted-foreground">未提供代码库链接</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-surface-2 p-4">
                    <div className="text-sm text-muted-foreground">暂无分享内容。</div>
                    {shareError && <div className="mt-2 text-xs text-destructive">加载失败：{shareError}</div>}

                    {canCreateShare && (
                      <div className="mt-4">
                        {!creatingShare ? (
                          <Button
                            onClick={() => {
                              setCreatingShare(true);
                              setAuthorNoteDraft('');
                              setVideoUrlDraft('');
                              setRepoUrlDraft('');
                            }}
                          >
                            创建分享
                          </Button>
                        ) : (
                          <div className="grid gap-3">
                            <textarea
                              value={authorNoteDraft}
                              onChange={(e) => setAuthorNoteDraft(e.target.value)}
                              className="w-full min-h-[96px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              placeholder="写下你的说明..."
                            />
                            <input
                              value={videoUrlDraft}
                              onChange={(e) => setVideoUrlDraft(e.target.value)}
                              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              placeholder="视频链接（可选）"
                            />
                            <input
                              value={repoUrlDraft}
                              onChange={(e) => setRepoUrlDraft(e.target.value)}
                              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              placeholder="代码库链接（可选）"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                disabled={authorNoteDraft.trim().length === 0}
                                onClick={async () => {
                                  if (!user) {
                                    openModal('signIn');
                                    return;
                                  }
                                  setShareError(null);
                                  const payload = {
                                    game_id: gameId,
                                    author_id: user.id,
                                    author_note: authorNoteDraft.trim(),
                                    video_url: videoUrlDraft.trim() || null,
                                    repo_url: repoUrlDraft.trim() || null,
                                  };
                                  const { error } = await supabase.from('game_posts').insert(payload);
                                  if (error) {
                                    setShareError(error.message);
                                    return;
                                  }
                                  setCreatingShare(false);
                                  const { data } = await supabase
                                    .from('game_posts')
                                    .select('game_id,author_id,author_note,video_url,repo_url,created_at,updated_at,author:profiles!game_posts_author_id_fkey(id,display_name,avatar_url)')
                                    .eq('game_id', gameId)
                                    .maybeSingle();
                                  setGamePost((data as unknown as GamePostRow | null) ?? null);
                                }}
                              >
                                发布
                              </Button>
                              <Button variant="ghost" onClick={() => setCreatingShare(false)}>
                                取消
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!user && (
                      <div className="mt-4 text-xs text-muted-foreground">
                        登录后可参与群聊。
                      </div>
                    )}

                    {user && !isOwner && (
                      <div className="mt-4 text-xs text-muted-foreground">
                        只有该游戏项目的创建者可以发布分享。
                      </div>
                    )}

                    {!game && (
                      <div className="mt-4 text-xs text-muted-foreground">
                        该游戏尚未绑定到数据库，暂不支持创建分享。
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border shadow-e1 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">评论区</div>
                <div className="text-xs text-muted-foreground">像帖子一样讨论这个游戏</div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{comments.length}</span> 条
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-2">
              {replyTarget && (
                <div className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate">回复给：{replyTarget.label}</div>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setReplyTarget(null)}
                  >
                    取消
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-border bg-surface p-4">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  className="w-full min-h-[84px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={user ? '写下你的评论...' : '登录后发表评论'}
                  disabled={submittingComment}
                />
                <div className="mt-3 flex items-center justify-end">
                  <Button
                    className="gap-2"
                    disabled={submittingComment || commentDraft.trim().length === 0}
                    onClick={async () => {
                      if (!user || !session?.access_token) {
                        openModal('signIn');
                        return;
                      }
                      const trimmed = commentDraft.trim();
                      if (!trimmed) return;
                      setSubmittingComment(true);
                      try {
                        const content = replyTarget ? `@${replyTarget.label} ${trimmed}` : trimmed;
                        await apiCreateGameComment({
                          accessToken: session.access_token,
                          gameId,
                          content,
                          parentId: replyTarget?.id ?? null,
                        });
                        setCommentDraft('');
                        setReplyTarget(null);
                        setCommentsRefreshNonce((n) => n + 1);
                      } finally {
                        setSubmittingComment(false);
                      }
                    }}
                  >
                    <Send className="w-4 h-4" />
                    {replyTarget ? '回复' : '发表评论'}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                {loadingComments ? (
                  <div className="text-sm text-muted-foreground">加载中...</div>
                ) : commentTree.roots.length === 0 ? (
                  <div className="text-sm text-muted-foreground">暂无评论，来抢沙发吧。</div>
                ) : (
                  <div className="space-y-4">
                    {commentTree.roots.map((c) => {
                      const cAuthor = normalizeProfile(c.author);
                      const cAuthorId = cAuthor?.id ?? '';
                      const cName = cAuthor?.display_name ?? (cAuthorId ? `User ${cAuthorId.slice(0, 4)}` : 'User');
                      const cAvatar = cAuthor?.avatar_url
                        ? String(cAuthor.avatar_url)
                        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${cAuthorId || c.id}`;
                      const replies = commentTree.replies.get(c.id) ?? [];
                      const isExpanded = expandedComments.includes(c.id);

                      return (
                        <div key={c.id} className="flex gap-4 group">
                          <Avatar src={cAvatar} alt={cName} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-foreground truncate">{cName}</div>
                              <div className="text-xs text-muted-foreground shrink-0">{new Date(c.created_at).toLocaleString()}</div>
                            </div>
                            <div className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">{c.content}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={c.viewerHasLiked ? 'text-primary hover:text-primary hover:bg-primary/10 gap-1.5 h-7 px-2' : 'text-muted-foreground hover:text-foreground hover:bg-surface gap-1.5 h-7 px-2'}
                                disabled={commentLikeBusy === c.id}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (!user || !session?.access_token) {
                                    openModal('signIn');
                                    return;
                                  }
                                  setCommentLikeBusy(c.id);
                                  try {
                                    const res = await apiToggleGameCommentLike({ accessToken: session.access_token, commentId: c.id });
                                    setComments((prev) =>
                                      prev.map((x) =>
                                        x.id !== c.id
                                          ? x
                                          : {
                                              ...x,
                                              viewerHasLiked: res.liked,
                                              likesCount: Math.max(0, (x.likesCount ?? 0) + (res.liked ? 1 : -1)),
                                            }
                                      )
                                    );
                                  } finally {
                                    setCommentLikeBusy(null);
                                  }
                                }}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span className="font-medium">{c.likesCount > 0 ? c.likesCount : ''}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground hover:bg-surface h-7 px-2"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setReplyTarget({ id: c.id, label: cName });
                                }}
                              >
                                回复
                              </Button>
                              {replies.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground hover:bg-surface h-7 px-2"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleReplies(c.id);
                                  }}
                                >
                                  {isExpanded ? `收起回复` : `展开 ${replies.length} 条回复`}
                                </Button>
                              )}
                            </div>

                            {isExpanded && replies.length > 0 && (
                              <div className="mt-3 pl-4 border-l border-border space-y-3">
                                {replies.map((r) => {
                                  const rAuthor = normalizeProfile(r.author);
                                  const rAuthorId = rAuthor?.id ?? '';
                                  const rName = rAuthor?.display_name ?? (rAuthorId ? `User ${rAuthorId.slice(0, 4)}` : 'User');
                                  const rAvatar = rAuthor?.avatar_url
                                    ? String(rAuthor.avatar_url)
                                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${rAuthorId || r.id}`;
                                  return (
                                    <div key={r.id} className="flex gap-3">
                                      <Avatar src={rAvatar} alt={rName} size="sm" className="w-7 h-7" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="text-sm font-semibold text-foreground truncate">{rName}</div>
                                          <div className="text-xs text-muted-foreground shrink-0">{new Date(r.created_at).toLocaleString()}</div>
                                        </div>
                                        <div className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">{r.content}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {commentsError && <div className="mt-3 text-xs text-destructive">加载失败：{commentsError}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
