import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ThumbsUp, Share2, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { mockGames, mockPosts } from '../data/mock';
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
  content: string;
  created_at: string;
  author: ProfileRow | ProfileRow[] | null;
};

type PostLikeRow = { post_id: string };

const normalizeProfile = (input: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null => {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  return input;
};

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const postId = id ?? '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId);
  const { user, openModal } = useAuthStore();

  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteNotFound, setRemoteNotFound] = useState(false);
  const [remotePost, setRemotePost] = useState<RemotePostRow | null>(null);
  const [remoteComments, setRemoteComments] = useState<RemoteCommentRow[]>([]);
  const [remoteLikes, setRemoteLikes] = useState(0);
  const [remoteCommentsCount, setRemoteCommentsCount] = useState(0);
  const [viewerHasLiked, setViewerHasLiked] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!isUuid) return;
    let cancelled = false;

    (async () => {
      setLoadingRemote(true);
      setRemoteNotFound(false);

      const { data, error } = await supabase
        .from('posts')
        .select('id,title,content,description,tags,is_ai_assisted,created_at,author:profiles(id,display_name,avatar_url),comments(count),post_likes(count)')
        .eq('id', postId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
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

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id,content,created_at,author:profiles(id,display_name,avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (!cancelled) setRemoteComments((commentsData as unknown as RemoteCommentRow[] | null) ?? []);

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
  }, [isUuid, postId, user]);

  const embeddedGames = useMemo(() => {
    const mockPost = mockPosts.find(p => p.id === postId);
    return mockPost?.gameIds ? mockPost.gameIds.map(gameId => mockGames.find(g => g.id === gameId)).filter(Boolean) : [];
  }, [postId]);

  const mockPost = useMemo(() => mockPosts.find(p => p.id === postId), [postId]);
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
        <h2 className="text-2xl font-bold text-gray-900">Post not found</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

  if (isUuid) {
    if (loadingRemote) {
      return (
        <div className="min-h-screen bg-[#F9FAFB]">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-[#F9FAFB]/90 supports-[backdrop-filter]:bg-[#F9FAFB]/70 backdrop-blur border-b border-gray-100">
              <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Feed
              </Link>
            </div>
            <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-gray-500">加载中...</div>
          </div>
        </div>
      );
    }

    if (remoteNotFound || !remotePost) {
      return (
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Post not found</h2>
          <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
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

    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-[#F9FAFB]/90 supports-[backdrop-filter]:bg-[#F9FAFB]/70 backdrop-blur border-b border-gray-100">
            <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Feed
            </Link>
          </div>

          <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <Link to={`/user/${authorId}`} className="flex items-center gap-3 min-w-0">
                  <Avatar src={authorAvatar} alt={authorName} size="md" />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{authorName}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="truncate">@{String(authorId).slice(0, 6)}</span>
                      <span>·</span>
                      <time dateTime={remotePost.created_at}>
                        {formatDistanceToNow(new Date(remotePost.created_at), { addSuffix: true })}
                      </time>
                    </div>
                  </div>
                </Link>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">{remotePost.title}</h1>

              <div className="flex flex-wrap gap-2 mb-8">
                {(remotePost.tags ?? []).map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                    {tag}
                  </Badge>
                ))}
                {remotePost.is_ai_assisted && (
                  <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                    AI Assisted
                  </Badge>
                )}
              </div>

              <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl">
                <ReactMarkdown>{remotePost.content}</ReactMarkdown>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  className={viewerHasLiked ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-2' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 gap-2'}
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
                <Button variant="ghost" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">{remoteCommentsCount}</span>
                </Button>
              </div>
              <Button variant="ghost" className="text-gray-500 hover:text-gray-900 gap-2">
                <Share2 className="w-5 h-5" />
                <span className="text-sm">Share</span>
              </Button>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              Discussion <span className="text-gray-400 text-sm font-normal">({remoteCommentsCount})</span>
            </h3>

            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full min-h-[88px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                      const { error } = await supabase.from('comments').insert({
                        post_id: postId,
                        author_id: user.id,
                        content: newComment.trim(),
                      });
                      if (error) throw error;
                      setNewComment('');

                      const { data: commentsData } = await supabase
                        .from('comments')
                        .select('id,content,created_at,author:profiles(id,display_name,avatar_url)')
                        .eq('post_id', postId)
                        .order('created_at', { ascending: true });
                      setRemoteComments(((commentsData ?? []) as unknown as RemoteCommentRow[]));
                      setRemoteCommentsCount(v => v + 1);
                    } finally {
                      setSubmittingComment(false);
                    }
                  }}
                >
                  发表评论
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {remoteComments.length > 0 ? (
                remoteComments.map((comment) => {
                  const cAuthor = normalizeProfile(comment.author);
                  const cAuthorId = cAuthor?.id ?? '';
                  const cName = cAuthor?.display_name ?? `User ${String(cAuthorId).slice(0, 4)}`;
                  const cAvatar = cAuthor?.avatar_url
                    ? String(cAuthor.avatar_url)
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${cAuthorId || comment.id}`;

                  return (
                    <div key={comment.id} className="flex gap-4 group">
                      <div className="flex-shrink-0">
                        <Link to={`/user/${cAuthorId}`} className="block">
                          <Avatar src={cAvatar} alt={cName} size="sm" />
                        </Link>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-2xl rounded-tl-none p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-gray-900">{cName}</span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">No comments yet. Be the first to share your thoughts!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const post = mockPost!;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Navigation */}
        <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-[#F9FAFB]/90 supports-[backdrop-filter]:bg-[#F9FAFB]/70 backdrop-blur border-b border-gray-100">
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Feed
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="md:col-span-12 lg:col-span-8 space-y-6">
            
            {/* Post Header & Content */}
            <article className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                {/* Author Info */}
                <div className="flex items-center justify-between mb-6">
                  <Link to={`/user/${post.author.id}`} className="flex items-center gap-3 min-w-0">
                    <Avatar src={post.author.avatar} alt={post.author.name} size="md" />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{post.author.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="truncate">{post.author.handle}</span>
                        <span>·</span>
                        <time dateTime={post.createdAt}>
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </time>
                      </div>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  {post.title}
                </h1>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                      {tag}
                    </Badge>
                  ))}
                  {post.isAiAssisted && (
                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                      AI Assisted
                    </Badge>
                  )}
                </div>

                {/* Markdown Content */}
                <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>

                {embeddedGames.length > 0 && (
                  <div className="mt-8">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Game Demo</div>
                    <div className="space-y-3">
                      {embeddedGames.map(game => (
                        <Link
                          key={game.id}
                          to={`/games/${game.id}`}
                          className="group flex items-center gap-3 bg-gray-50 hover:bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors p-3"
                        >
                          <div className="w-[30%] max-w-[180px] aspect-video bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
                                  {game.title}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-1">
                                  {game.description}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className="bg-black/60 text-white border-none text-xs font-normal">Demo</Badge>
                                <span className="text-xs text-gray-500">👍 {game.likes.toLocaleString()}</span>
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
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    <span className="font-medium">{post.likes}</span>
                  </Button>
                  <Button variant="ghost" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium">{post.commentsCount}</span>
                  </Button>
                </div>
                <Button variant="ghost" className="text-gray-500 hover:text-gray-900 gap-2">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </Button>
              </div>
            </article>

            {/* Comments Section */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 md:p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                Discussion <span className="text-gray-400 text-sm font-normal">({post.commentsCount})</span>
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
                        <div className="bg-gray-50 rounded-2xl rounded-tl-none p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-gray-900">{comment.author.name}</span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-1">
                          <button className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1">
                            Like {comment.likes > 0 && <span>({comment.likes})</span>}
                          </button>
                          
                          {comment.replies && comment.replies.length > 0 ? (
                            <button 
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
                            <button className="text-xs font-medium text-gray-500 hover:text-gray-900">Reply</button>
                          )}
                        </div>

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && expandedComments.includes(comment.id) && (
                          <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-100">
                            {comment.replies.map(reply => (
                              <div key={reply.id} className="flex gap-3">
                                <div className="flex-shrink-0">
                                  <Link to={`/user/${reply.author.id}`} className="block">
                                    <Avatar src={reply.author.avatar} alt={reply.author.name} size="sm" className="w-6 h-6" />
                                  </Link>
                                </div>
                                <div className="flex-1">
                                  <div className="bg-gray-50 rounded-2xl rounded-tl-none p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-semibold text-xs text-gray-900">{reply.author.name}</span>
                                      <span className="text-[10px] text-gray-400">
                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-xs leading-relaxed">
                                      {reply.content}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 ml-1">
                                    <button className="text-[10px] font-medium text-gray-500 hover:text-gray-900">
                                      Like {reply.likes > 0 && <span>({reply.likes})</span>}
                                    </button>
                                    <button className="text-[10px] font-medium text-gray-500 hover:text-gray-900">Reply</button>
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
                  <div className="text-center py-8 text-gray-500">
                    No comments yet. Be the first to share your thoughts!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar (Optional for related posts or author info) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
             <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">About the Author</h3>
                <Link to={`/user/${post.author.id}`} className="flex items-center gap-3 mb-4 min-w-0">
                  <Avatar src={post.author.avatar} alt={post.author.name} size="lg" />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{post.author.name}</div>
                    <div className="text-sm text-gray-500 truncate">{post.author.handle}</div>
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
