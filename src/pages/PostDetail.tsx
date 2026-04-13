import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ThumbsUp, Share2, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { mockGames, mockPosts } from '../data/mock';
import { getLocalPostById } from '../data/localPostsStore';
import { FORCE_MOCK_POSTS } from '../config/featureFlags';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type CountRow = { count: number };

type RemotePostRow = {
  id: string;
  title: string;
  content: string;
  description: string | null;
  tags: string[] | null;
  is_ai_assisted: boolean;
  created_at: string;
  author: ProfileRow | ProfileRow[] | null;
  comments: CountRow[];
  post_likes: CountRow[];
};

type RemoteCommentRow = {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: ProfileRow | ProfileRow[] | null;
  comment_likes: CountRow[];
};

type PostLikeRow = { post_id: string };

type CommentLikeRow = { comment_id: string };

type RemoteComment = RemoteCommentRow & {
  likesCount: number;
  viewerHasLiked: boolean;
};

const normalizeProfile = (input: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null => {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  return input;
};

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const postId = id ?? '';
  const isUuid = !FORCE_MOCK_POSTS && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId);
  const { user, openModal } = useAuthStore();

  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteNotFound, setRemoteNotFound] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remotePost, setRemotePost] = useState<RemotePostRow | null>(null);
  const [remoteComments, setRemoteComments] = useState<RemoteComment[]>([]);
  const [remoteLikes, setRemoteLikes] = useState(0);
  const [remoteCommentsCount, setRemoteCommentsCount] = useState(0);
  const [viewerHasLiked, setViewerHasLiked] = useState(false);

  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [postActionError, setPostActionError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [commentLikeBusy, setCommentLikeBusy] = useState<string | null>(null);

  const [replyTarget, setReplyTarget] = useState<
    | null
    | {
        rootId: string;
        mentionName?: string;
        label: string;
      }
  >(null);

  const mapCommentRow = useCallback((row: RemoteCommentRow, likedSet: Set<string>): RemoteComment => {
    const likesCount = row.comment_likes?.[0]?.count ?? 0;
    return {
      ...row,
      likesCount: Number(likesCount),
      viewerHasLiked: likedSet.has(row.id),
    };
  }, []);

  const refreshRemoteComments = useCallback(async (targetPostId: string) => {
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('id,parent_id,content,created_at,author:profiles!comments_author_id_fkey(id,display_name,avatar_url),comment_likes(count)')
      .eq('post_id', targetPostId)
      .order('created_at', { ascending: true });

    if (commentsError || !commentsData) {
      return { rows: [] as RemoteComment[], error: commentsError?.message ?? null };
    }

    const rawRows = (commentsData as unknown as RemoteCommentRow[] | null) ?? [];

    let likedSet = new Set<string>();
    if (user && rawRows.length > 0) {
      const { data: likedRows } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in(
          'comment_id',
          rawRows.map(r => r.id)
        );
      likedSet = new Set(((likedRows as CommentLikeRow[] | null | undefined) ?? []).map(r => r.comment_id));
    }

    return {
      rows: rawRows.map(r => mapCommentRow(r, likedSet)),
      error: null,
    };
  }, [mapCommentRow, user]);

  useEffect(() => {
    if (!isUuid) return;
    let cancelled = false;

    (async () => {
      setLoadingRemote(true);
      setRemoteNotFound(false);
      setRemoteError(null);

      const { data, error } = await supabase
        .from('posts')
        .select('id,title,content,description,tags,is_ai_assisted,created_at,author:profiles!posts_author_id_fkey(id,display_name,avatar_url),comments(count),post_likes(count)')
        .eq('id', postId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        if (error) setRemoteError(error.message);
        setRemoteNotFound(true);
        setLoadingRemote(false);
        return;
      }

      const row = data as unknown as RemotePostRow;
      const likesCount = row.post_likes?.[0]?.count ?? 0;
      const commentsCount = row.comments?.[0]?.count ?? 0;
      setRemoteLikes(Number(likesCount));
      setRemoteCommentsCount(Number(commentsCount));
      setRemotePost(row);

      const commentsResult = await refreshRemoteComments(postId);
      if (!cancelled) setRemoteComments(commentsResult.rows);

      if (user) {
        const { data: likeRow } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled) setViewerHasLiked(Boolean(likeRow as PostLikeRow | null));
      } else {
        setViewerHasLiked(false);
      }

      setLoadingRemote(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isUuid, postId, user, refreshRemoteComments]);

  useEffect(() => {
    if (!postMenuOpen) return;
    const onMouseDown = () => setPostMenuOpen(false);
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [postMenuOpen]);

  const localPost = useMemo(() => getLocalPostById(postId), [postId]);
  const embeddedGames = useMemo(() => {
    const p = mockPosts.find(x => x.id === postId) ?? localPost;
    return p?.gameIds ? p.gameIds.map(gameId => mockGames.find(g => g.id === gameId)).filter(Boolean) : [];
  }, [localPost, postId]);

  const mockPost = useMemo(() => mockPosts.find(p => p.id === postId) ?? localPost, [localPost, postId]);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId) 
        : [...prev, commentId]
    );
  };

  if (!isUuid && !mockPost) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-foreground">Post not found</h2>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

  if (isUuid) {
    if (loadingRemote) {
      return (
        <div className="min-h-screen bg-background text-foreground">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-background/90 supports-[backdrop-filter]:bg-background/70 backdrop-blur border-b border-border">
              <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Feed
              </Link>
            </div>
            <div className="mt-6 bg-surface rounded-xl border border-border shadow-e1 p-6 text-sm text-muted-foreground">加载中...</div>
          </div>
        </div>
      );
    }

    if (remoteNotFound || !remotePost) {
      return (
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-foreground">Post not found</h2>
          {remoteError && <div className="text-sm text-destructive mt-3">加载失败：{remoteError}</div>}
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      );
    }

    const postAuthor = normalizeProfile(remotePost.author);
    const authorId = postAuthor?.id ?? '';
    const authorName = postAuthor?.display_name ?? `User ${String(authorId).slice(0, 4)}`;
    const authorAvatar = postAuthor?.avatar_url
      ? String(postAuthor.avatar_url)
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId || remotePost.id}`;

    const canManagePost = Boolean(user && user.id === authorId);

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-background/90 supports-[backdrop-filter]:bg-background/70 backdrop-blur border-b border-border">
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Feed
            </Link>
          </div>

          <div className="mt-6 bg-surface rounded-xl border border-border shadow-e1 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <Link to={`/user/${authorId}`} className="flex items-center gap-3 min-w-0">
                  <Avatar src={authorAvatar} alt={authorName} size="md" />
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{authorName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="truncate">@{String(authorId).slice(0, 6)}</span>
                      <span>·</span>
                      <time dateTime={remotePost.created_at}>
                        {formatDistanceToNow(new Date(remotePost.created_at), { addSuffix: true })}
                      </time>
                    </div>
                  </div>
                </Link>
                <div className="relative flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setPostActionError(null);
                      setPostMenuOpen(v => !v);
                    }}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>

                  {postMenuOpen && (
                    <div className="absolute right-0 top-11 w-44 rounded-xl border border-border bg-surface shadow-e3 overflow-hidden z-50">
                      {canManagePost ? (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            setPostMenuOpen(false);
                            if (!user) {
                              openModal('signIn');
                              return;
                            }
                            const ok = window.confirm('确认删除这篇帖子吗？删除后无法恢复。');
                            if (!ok) return;
                            setPostActionError(null);
                            const { error } = await supabase
                              .from('posts')
                              .delete()
                              .eq('id', postId)
                              .eq('author_id', user.id);
                            if (error) {
                              setPostActionError(error.message);
                              return;
                            }
                            window.dispatchEvent(new Event('posts:refresh'));
                            window.location.href = '/';
                          }}
                        >
                          删除帖子
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-2"
                          onClick={async () => {
                            setPostMenuOpen(false);
                            if (!user) {
                              openModal('signIn');
                              return;
                            }
                            const reason = window.prompt('举报原因（可选）') ?? null;
                            const { error } = await supabase
                              .from('post_reports')
                              .upsert({ post_id: postId, reporter_id: user.id, reason }, { onConflict: 'post_id,reporter_id' });
                            if (error) {
                              setPostActionError(error.message);
                              return;
                            }
                          }}
                        >
                          举报帖子
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {postActionError && <div className="text-sm text-destructive mb-4">操作失败：{postActionError}</div>}

              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">{remotePost.title}</h1>

              <div className="flex flex-wrap gap-2 mb-8">
                {(remotePost.tags ?? []).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-surface-2 text-muted-foreground hover:bg-surface border border-border">
                    {tag}
                  </Badge>
                ))}
                {remotePost.is_ai_assisted && (
                  <Badge variant="outline" className="text-primary border-primary/25 bg-primary/10">
                    AI Assisted
                  </Badge>
                )}
              </div>

              <div className="max-w-none text-[15px] leading-relaxed text-foreground [&_a]:text-primary [&_a:hover]:underline [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_code]:text-foreground [&_pre]:bg-surface-2 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-auto">
                <ReactMarkdown>{remotePost.content}</ReactMarkdown>
              </div>
            </div>

            <div className="bg-surface-2 px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  className={viewerHasLiked ? 'text-primary hover:text-primary hover:bg-primary/10 gap-2' : 'text-muted-foreground hover:text-foreground hover:bg-surface gap-2'}
                  disabled={liking}
                  onClick={async () => {
                    if (!user) {
                      openModal('signIn');
                      return;
                    }
                    setLiking(true);
                    try {
                      if (viewerHasLiked) {
                        const { error } = await supabase
                          .from('post_likes')
                          .delete()
                          .eq('post_id', postId)
                          .eq('user_id', user.id);
                        if (error) throw error;
                        setViewerHasLiked(false);
                        setRemoteLikes(v => Math.max(0, v - 1));
                      } else {
                        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
                        if (error) throw error;
                        setViewerHasLiked(true);
                        setRemoteLikes(v => v + 1);
                      }
                    } finally {
                      setLiking(false);
                    }
                  }}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="font-medium">{remoteLikes}</span>
                </Button>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-surface gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">{remoteCommentsCount}</span>
                </Button>
              </div>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-surface gap-2">
                <Share2 className="w-5 h-5" />
                <span className="text-sm">Share</span>
              </Button>
            </div>
          </div>

          <div className="mt-6 bg-surface rounded-xl border border-border shadow-e1 p-6 md:p-8">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              Discussion <span className="text-muted-foreground text-sm font-normal">({remoteCommentsCount})</span>
            </h3>

            <div className="mb-6">
              {replyTarget && (
                <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                  <div className="min-w-0 truncate">回复给：{replyTarget.label}</div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setReplyTarget(null)}
                  >
                    取消
                  </button>
                </div>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full min-h-[88px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={user ? '写下你的评论...' : '登录后发表评论'}
                disabled={!user || submittingComment}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  disabled={!user || submittingComment || newComment.trim().length === 0}
                  onClick={async () => {
                    if (!user) {
                      openModal('signIn');
                      return;
                    }
                    setSubmittingComment(true);
                    try {
                      const rootId = replyTarget?.rootId ?? null;
                      const mentionName = replyTarget?.mentionName;
                      const trimmed = newComment.trim();
                      const withMention = mentionName && !trimmed.startsWith(`@${mentionName}`)
                        ? `@${mentionName} ${trimmed}`
                        : trimmed;

                      const { error } = await supabase.from('comments').insert({
                        post_id: postId,
                        author_id: user.id,
                        content: withMention,
                        parent_id: rootId,
                      });
                      if (error) throw error;
                      setNewComment('');
                      setReplyTarget(null);

                      const commentsResult = await refreshRemoteComments(postId);
                      setRemoteComments(commentsResult.rows);
                      setRemoteCommentsCount(v => v + 1);
                    } finally {
                      setSubmittingComment(false);
                    }
                  }}
                >
                  {replyTarget ? '回复' : '发表评论'}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {remoteComments.length > 0 ? (
                (() => {
                  const top = remoteComments.filter(c => !c.parent_id);
                  const repliesByRoot = new Map<string, RemoteComment[]>();
                  for (const c of remoteComments) {
                    if (!c.parent_id) continue;
                    const arr = repliesByRoot.get(c.parent_id) ?? [];
                    arr.push(c);
                    repliesByRoot.set(c.parent_id, arr);
                  }

                  const renderCommentRow = (comment: RemoteComment, depth: 0 | 1, repliesCount: number = 0) => {
                    const cAuthor = normalizeProfile(comment.author);
                    const cAuthorId = cAuthor?.id ?? '';
                    const cName = cAuthor?.display_name ?? `User ${String(cAuthorId).slice(0, 4)}`;
                    const cAvatar = cAuthor?.avatar_url
                      ? String(cAuthor.avatar_url)
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${cAuthorId || comment.id}`;
                    
                    const isExpanded = expandedComments.includes(comment.id);

                    return (
                      <div key={comment.id} className={depth === 0 ? 'flex gap-4 group' : 'flex gap-3 group mt-3'}>
                        <div className="flex-shrink-0">
                          <Link to={`/user/${cAuthorId}`} className="block">
                            <Avatar src={cAvatar} alt={cName} size="sm" className={depth === 0 ? undefined : 'w-6 h-6'} />
                          </Link>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={depth === 0 ? 'bg-surface-2 border border-border rounded-xl rounded-tl-none p-4' : 'bg-transparent pt-1 pb-2'}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={depth === 0 ? 'font-semibold text-sm text-foreground' : 'font-semibold text-[13px] text-foreground'}>{cName}</span>
                                {depth === 1 && comment.content.startsWith('@') && (
                                  <span className="text-[12px] text-muted-foreground font-medium">
                                    回复
                                  </span>
                                )}
                              </div>
                              <span className={depth === 0 ? 'text-xs text-muted-foreground/70' : 'text-[11px] text-muted-foreground/70'}>
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className={depth === 0 ? 'text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap' : 'text-muted-foreground text-[13px] leading-relaxed whitespace-pre-wrap'}>
                              {depth === 1 && comment.content.startsWith('@') ? (
                                <>
                                  <span className="text-primary mr-1">{comment.content.split(' ')[0]}</span>
                                  {comment.content.substring(comment.content.indexOf(' ') + 1)}
                                </>
                              ) : (
                                comment.content
                              )}
                            </p>

                            <div className={depth === 0 ? 'mt-3 flex items-center gap-2' : 'mt-1.5 flex items-center gap-2'}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={comment.viewerHasLiked ? 'text-primary hover:text-primary hover:bg-primary/10 gap-1.5 h-7 px-2' : 'text-muted-foreground hover:text-foreground hover:bg-surface gap-1.5 h-7 px-2'}
                                disabled={commentLikeBusy === comment.id}
                                onClick={async () => {
                                  if (!user) {
                                    openModal('signIn');
                                    return;
                                  }
                                  setCommentLikeBusy(comment.id);
                                  try {
                                    if (comment.viewerHasLiked) {
                                      const { error } = await supabase
                                        .from('comment_likes')
                                        .delete()
                                        .eq('comment_id', comment.id)
                                        .eq('user_id', user.id);
                                      if (error) throw error;
                                      setRemoteComments(prev =>
                                        prev.map(c =>
                                          c.id === comment.id
                                            ? { ...c, viewerHasLiked: false, likesCount: Math.max(0, c.likesCount - 1) }
                                            : c
                                        )
                                      );
                                    } else {
                                      const { error } = await supabase
                                        .from('comment_likes')
                                        .insert({ comment_id: comment.id, user_id: user.id });
                                      if (error) throw error;
                                      setRemoteComments(prev =>
                                        prev.map(c =>
                                          c.id === comment.id
                                            ? { ...c, viewerHasLiked: true, likesCount: c.likesCount + 1 }
                                            : c
                                        )
                                      );
                                    }
                                  } finally {
                                    setCommentLikeBusy(null);
                                  }
                                }}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span className="font-medium">{comment.likesCount > 0 ? comment.likesCount : ''}</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-surface"
                                onClick={() => {
                                  const rootId = comment.parent_id ?? comment.id;
                                  const mentionName = comment.parent_id ? cName : undefined;
                                  setReplyTarget({ rootId, mentionName, label: cName });
                                  if (mentionName) {
                                    setNewComment(prev => {
                                      const trimmedPrev = prev.trim();
                                      if (trimmedPrev.startsWith(`@${mentionName}`)) return prev;
                                      return `@${mentionName} `;
                                    });
                                  }
                                }}
                              >
                                回复
                              </Button>
                              
                              {depth === 0 && repliesCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleReplies(comment.id)}
                                  className="ml-2 text-xs font-medium text-primary hover:text-primary flex items-center gap-1"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-3 h-3" />
                                      收起回复
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3" />
                                      展开 {repliesCount} 条回复
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-6">
                      {top.map((c) => {
                        const replies = repliesByRoot.get(c.id) ?? [];
                        const isExpanded = expandedComments.includes(c.id);
                        return (
                          <div key={c.id}>
                            {renderCommentRow(c, 0, replies.length)}
                            {replies.length > 0 && isExpanded && (
                              <div className="mt-2 pl-4 ml-[1.125rem] border-l-2 border-border flex flex-col gap-1">
                                {replies.map(r => renderCommentRow(r, 1, 0))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-muted-foreground">No comments yet. Be the first to share your thoughts!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const post = mockPost!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Navigation */}
        <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-background/90 supports-[backdrop-filter]:bg-background/70 backdrop-blur border-b border-border">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Feed
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="md:col-span-12 lg:col-span-8 space-y-6">
            
            {/* Post Header & Content */}
            <article className="bg-surface rounded-xl border border-border shadow-e1 overflow-hidden">
              <div className="p-6 md:p-8">
                {/* Author Info */}
                <div className="flex items-center justify-between mb-6">
                  <Link to={`/user/${post.author.id}`} className="flex items-center gap-3 min-w-0">
                    <Avatar src={post.author.avatar} alt={post.author.name} size="md" />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{post.author.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="truncate">{post.author.handle}</span>
                        <span>·</span>
                        <time dateTime={post.createdAt}>
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </time>
                      </div>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
                  {post.title}
                </h1>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-surface-2 text-muted-foreground hover:bg-surface border border-border">
                      {tag}
                    </Badge>
                  ))}
                  {post.isAiAssisted && (
                    <Badge variant="outline" className="text-primary border-primary/25 bg-primary/10">
                      AI Assisted
                    </Badge>
                  )}
                </div>

                {/* Markdown Content */}
                <div className="max-w-none text-[15px] leading-relaxed text-foreground [&_a]:text-primary [&_a:hover]:underline [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_code]:text-foreground [&_pre]:bg-surface-2 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-auto">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>

                {embeddedGames.length > 0 && (
                  <div className="mt-8">
                    <div className="text-sm font-semibold text-foreground mb-3">相关游戏</div>
                    <div className="space-y-3">
                      {embeddedGames.map(game => (
                        <Link
                          key={game.id}
                          to={`/games/${game.id}`}
                          className="group flex items-center gap-3 bg-surface-2 hover:bg-surface rounded-xl border border-border hover:border-border-strong transition-colors p-3"
                        >
                          <div className="w-[30%] max-w-media-sm aspect-video bg-surface rounded-lg overflow-hidden flex-shrink-0 border border-border">
                            <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                  {game.title}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {game.description}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className="bg-surface text-muted-foreground border border-border text-xs font-normal">游戏</Badge>
                                <span className="text-xs text-muted-foreground">👍 {game.likes.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="bg-surface-2 px-6 py-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-surface gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    <span className="font-medium">{post.likes}</span>
                  </Button>
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-surface gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium">{post.commentsCount}</span>
                  </Button>
                </div>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-surface gap-2">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </Button>
              </div>
            </article>

            {/* Comments Section */}
            <div className="bg-surface rounded-xl border border-border shadow-e1 p-6 md:p-8">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                Discussion <span className="text-muted-foreground text-sm font-normal">({post.commentsCount})</span>
              </h3>
              
              <div className="space-y-6">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map(comment => (
                    <div key={comment.id} className="flex gap-4 group">
                      <div className="flex-shrink-0">
                        <Link to={`/user/${comment.author.id}`} className="block">
                          <Avatar src={comment.author.avatar} alt={comment.author.name} size="sm" />
                        </Link>
                      </div>
                      <div className="flex-1">
                        <div className="bg-surface-2 border border-border rounded-xl rounded-tl-none p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-foreground">{comment.author.name}</span>
                            <span className="text-xs text-muted-foreground/70">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-foreground/90 text-sm leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-1">
                          <button className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                            Like {comment.likes > 0 && <span>({comment.likes})</span>}
                          </button>
                          
                          {comment.replies && comment.replies.length > 0 ? (
                            <button 
                              className="text-xs font-medium text-primary hover:text-primary flex items-center gap-1"
                              onClick={() => toggleReplies(comment.id)}
                            >
                              {expandedComments.includes(comment.id) ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  Hide {comment.replies.length} replies
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Reply ({comment.replies.length})
                                </>
                              )}
                            </button>
                          ) : (
                            <button className="text-xs font-medium text-muted-foreground hover:text-foreground">Reply</button>
                          )}
                        </div>

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && expandedComments.includes(comment.id) && (
                          <div className="mt-4 space-y-4 pl-4 border-l-2 border-border">
                            {comment.replies.map(reply => (
                              <div key={reply.id} className="flex gap-3">
                                <div className="flex-shrink-0">
                                  <Link to={`/user/${reply.author.id}`} className="block">
                                    <Avatar src={reply.author.avatar} alt={reply.author.name} size="sm" className="w-6 h-6" />
                                  </Link>
                                </div>
                                <div className="flex-1">
                                  <div className="bg-surface-2 border border-border rounded-xl rounded-tl-none p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-xs text-foreground">{reply.author.name}</span>
                                      <span className="text-[10px] text-muted-foreground/70">
                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                      </span>
                                    </div>
                                    <p className="text-foreground/90 text-xs leading-relaxed">
                                      {reply.content}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 ml-1">
                                    <button className="text-[10px] font-medium text-muted-foreground hover:text-foreground">
                                      Like {reply.likes > 0 && <span>({reply.likes})</span>}
                                    </button>
                                    <button className="text-[10px] font-medium text-muted-foreground hover:text-foreground">Reply</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No comments yet. Be the first to share your thoughts!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar (Optional for related posts or author info) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
             <div className="bg-surface rounded-xl border border-border p-6 shadow-e1 sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">About the Author</h3>
                <Link to={`/user/${post.author.id}`} className="flex items-center gap-3 mb-4 min-w-0">
                  <Avatar src={post.author.avatar} alt={post.author.name} size="lg" />
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{post.author.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{post.author.handle}</div>
                  </div>
                </Link>
                <Button className="w-full">Follow</Button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
