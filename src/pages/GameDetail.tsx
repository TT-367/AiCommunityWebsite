import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Link as LinkIcon, Send, ThumbsUp, Users } from 'lucide-react';
import { mockGames } from '../data/mock';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';

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

type GameChatMessageRow = {
  id: string;
  game_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: ProfileRow | ProfileRow[] | null;
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

  const { user, openModal } = useAuthStore();

  const [loadingShare, setLoadingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [gamePost, setGamePost] = useState<GamePostRow | null>(null);

  const [creatingShare, setCreatingShare] = useState(false);
  const [authorNoteDraft, setAuthorNoteDraft] = useState('');
  const [videoUrlDraft, setVideoUrlDraft] = useState('');
  const [repoUrlDraft, setRepoUrlDraft] = useState('');

  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<GameChatMessageRow[]>([]);
  const [chatLiveStatus, setChatLiveStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const pollTimerRef = useRef<number | null>(null);
  const pollBusyRef = useRef(false);
  const scrollToBottom = (smooth: boolean) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
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
      setLoadingChat(true);
      setChatError(null);
      const { data, error } = await supabase
        .from('game_chat_messages')
        .select('id,game_id,sender_id,content,created_at,sender:profiles!game_chat_messages_sender_id_fkey(id,display_name,avatar_url)')
        .eq('game_id', gameId)
        .is('parent_id', null)
        .order('created_at', { ascending: true })
        .limit(500);
      if (cancelled) return;
      if (error) {
        setChatError(error.message);
        setMessages([]);
      } else {
        setMessages((data as unknown as GameChatMessageRow[] | null) ?? []);
        setTimeout(() => scrollToBottom(false), 0);
      }
      setLoadingChat(false);
    })();

    const channel = supabase
      .channel(`game_chat_${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_chat_messages', filter: `game_id=eq.${gameId}` },
        async (payload) => {
          const row = payload.new as unknown as { id: string };
          const { data } = await supabase
            .from('game_chat_messages')
            .select('id,game_id,sender_id,content,created_at,sender:profiles!game_chat_messages_sender_id_fkey(id,display_name,avatar_url),parent_id')
            .eq('id', row.id)
            .maybeSingle();
          if (cancelled || !data) return;
          const nextRowAll = data as unknown as (GameChatMessageRow & { parent_id: string | null });
          if (nextRowAll.parent_id) return;
          const nextRow: GameChatMessageRow = {
            id: nextRowAll.id,
            game_id: nextRowAll.game_id,
            sender_id: nextRowAll.sender_id,
            content: nextRowAll.content,
            created_at: nextRowAll.created_at,
            sender: (nextRowAll as any).sender,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === nextRow.id)) return prev;
            return [...prev, nextRow];
          });
          if (stickToBottomRef.current) setTimeout(() => scrollToBottom(true), 0);
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') setChatLiveStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setChatLiveStatus('error');
        else setChatLiveStatus('connecting');
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    const pollOnce = async () => {
      if (pollBusyRef.current) return;
      pollBusyRef.current = true;
      try {
        const { data, error } = await supabase
          .from('game_chat_messages')
          .select('id,game_id,sender_id,content,created_at,sender:profiles!game_chat_messages_sender_id_fkey(id,display_name,avatar_url)')
          .eq('game_id', gameId)
          .is('parent_id', null)
          .order('created_at', { ascending: false })
          .limit(50);
        if (cancelled) return;
        if (error || !data) return;

        const rows = ((data as unknown as GameChatMessageRow[] | null) ?? []).slice().reverse();
        setMessages((prev) => {
          const existing = new Set(prev.map(m => m.id));
          const merged = [...prev];
          for (const r of rows) {
            if (!existing.has(r.id)) merged.push(r);
          }
          return merged;
        });
        if (stickToBottomRef.current) setTimeout(() => scrollToBottom(false), 0);
      } finally {
        pollBusyRef.current = false;
      }
    };

    pollOnce();
    pollTimerRef.current = window.setInterval(() => {
      if (chatLiveStatus === 'live') return;
      pollOnce();
    }, 2500);

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [gameId, chatLiveStatus]);

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

  if (!game && !fallbackGame && !loadingGame) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Game not found</h2>
        <Link to="/games" className="text-blue-600 hover:underline mt-4 inline-block">
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
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/games" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回展馆
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-500">
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
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
                  <p className="text-gray-600 leading-relaxed">{description}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar src={ownerAvatar} alt={ownerName} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{ownerName}</div>
                      <div className="text-xs text-gray-500 truncate">@{(ownerId || fallbackGame?.author.id || gameId).slice(0, 6)}</div>
                    </div>
                    {loadingGame && <span className="text-xs text-gray-400">加载中...</span>}
                    {gameError && <span className="text-xs text-red-600">{gameError}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-gray-900 mb-3">分享</div>

                {loadingShare ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">加载中...</div>
                ) : gamePost ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex items-center gap-3">
                        <Avatar src={shareAuthorAvatar} alt={shareAuthorName} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{shareAuthorName}</div>
                          <div className="text-xs text-gray-500 truncate">@{shareAuthorId.slice(0, 6)}</div>
                        </div>
                      </div>
                      {canEditShare && (
                        <Badge variant="secondary" className="bg-white border border-gray-100 text-gray-600">你发布的分享</Badge>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{gamePost.author_note}</div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-100">视频</div>
                        <div className="aspect-video bg-gray-50">
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
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 px-4">
                                暂不支持该视频链接预览，点击右侧按钮打开
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">未提供视频链接</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-100">代码库</div>
                        <div className="p-3">
                          {gamePost.repo_url ? (
                            <a
                              href={gamePost.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <LinkIcon className="w-4 h-4" />
                              <span className="truncate max-w-[28rem]">{gamePost.repo_url}</span>
                            </a>
                          ) : (
                            <div className="text-sm text-gray-500">未提供代码库链接</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">暂无分享内容。</div>
                    {shareError && <div className="mt-2 text-xs text-red-600">加载失败：{shareError}</div>}

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
                              className="w-full min-h-[96px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                              placeholder="写下你的说明..."
                            />
                            <input
                              value={videoUrlDraft}
                              onChange={(e) => setVideoUrlDraft(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                              placeholder="视频链接（可选）"
                            />
                            <input
                              value={repoUrlDraft}
                              onChange={(e) => setRepoUrlDraft(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                      <div className="mt-4 text-xs text-gray-500">
                        登录后可参与群聊。
                      </div>
                    )}

                    {user && !isOwner && (
                      <div className="mt-4 text-xs text-gray-500">
                        只有该游戏项目的创建者可以发布分享。
                      </div>
                    )}

                    {!game && (
                      <div className="mt-4 text-xs text-gray-500">
                        该游戏尚未绑定到数据库，暂不支持创建分享。
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">聊天室</div>
                  <div className="text-xs text-gray-500">
                    像微信群一样聊聊这个游戏
                    <span className={chatLiveStatus === 'live' ? 'ml-2 text-green-600' : chatLiveStatus === 'error' ? 'ml-2 text-red-600' : 'ml-2 text-gray-400'}>
                      {chatLiveStatus === 'live' ? '实时已连接' : chatLiveStatus === 'error' ? '实时连接异常' : '实时连接中'}
                    </span>
                  </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={() => {
                  stickToBottomRef.current = true;
                  scrollToBottom(true);
                }}
              >
                回到最新
              </Button>
            </div>

            <div
              ref={listRef}
              className="h-[420px] md:h-[520px] overflow-auto px-6 py-4 bg-[#F9FAFB]"
              onScroll={() => {
                const el = listRef.current;
                if (!el) return;
                const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                stickToBottomRef.current = nearBottom;
              }}
            >
              {loadingChat ? (
                <div className="text-sm text-gray-500">加载中...</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500">还没有人发言，来聊聊吧。</div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const sender = normalizeProfile(m.sender);
                    const senderId = sender?.id ?? m.sender_id;
                    const senderName = sender?.display_name ?? `User ${String(senderId).slice(0, 4)}`;
                    const senderAvatar = sender?.avatar_url
                      ? String(sender.avatar_url)
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderId || m.id}`;
                    const mine = Boolean(user && user.id === senderId);

                    return (
                      <div key={m.id}>
                        <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
                          <div className={mine ? 'max-w-[82%] flex flex-row-reverse items-end gap-2' : 'max-w-[82%] flex items-end gap-2'}>
                            <Avatar src={senderAvatar} alt={senderName} size="sm" className="w-7 h-7" />
                            <div className={mine ? 'bg-purple-600 text-white rounded-2xl rounded-br-md px-3 py-2 shadow-sm' : 'bg-white text-gray-900 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm border border-gray-100'}>
                              <div className={mine ? 'text-[11px] text-white/80 mb-1' : 'text-[11px] text-gray-500 mb-1'}>{senderName}</div>
                              <div className={mine ? 'text-sm whitespace-pre-wrap' : 'text-sm whitespace-pre-wrap'}>{m.content}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {chatError && <div className="mt-3 text-xs text-red-600">加载失败：{chatError}</div>}
            </div>

            <div className="border-t border-gray-100 bg-white px-6 py-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-h-[44px] max-h-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={user ? '输入消息，Enter 发送，Shift+Enter 换行' : '登录后参与群聊'}
                  disabled={!user || sending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const btn = document.getElementById('send_game_message_btn') as HTMLButtonElement | null;
                      btn?.click();
                    }
                  }}
                />
                <Button
                  id="send_game_message_btn"
                  className="h-11 px-4"
                  disabled={!user || sending || newMessage.trim().length === 0}
                  onClick={async () => {
                    if (!user) {
                      openModal('signIn');
                      return;
                    }
                    const trimmed = newMessage.trim();
                    if (!trimmed) return;
                    setSending(true);
                    try {
                      const { data, error } = await supabase
                        .from('game_chat_messages')
                        .insert({
                          game_id: gameId,
                          sender_id: user.id,
                          parent_id: null,
                          content: trimmed,
                        })
                        .select('id,game_id,sender_id,content,created_at,sender:profiles!game_chat_messages_sender_id_fkey(id,display_name,avatar_url)')
                        .maybeSingle();
                      if (error) throw error;

                      if (data) {
                        const row = data as unknown as GameChatMessageRow;
                        setMessages((prev) => {
                          if (prev.some((m) => m.id === row.id)) return prev;
                          return [...prev, row];
                        });
                      }
                      setNewMessage('');
                      stickToBottomRef.current = true;
                      setTimeout(() => scrollToBottom(true), 0);
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  发送
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
