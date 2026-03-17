import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ThumbsUp, Share2, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { mockGames, mockPosts } from '../data/mock';

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const post = mockPosts.find(p => p.id === id);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);

  const embeddedGames = post?.gameIds
    ? post.gameIds.map(gameId => mockGames.find(g => g.id === gameId)).filter(Boolean)
    : [];

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId) 
        : [...prev, commentId]
    );
  };

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Post not found</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

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
                  <div className="flex items-center gap-3">
                    <Avatar src={post.author.avatar} alt={post.author.name} size="md" />
                    <div>
                      <div className="font-semibold text-gray-900">{post.author.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{post.author.handle}</span>
                        <span>·</span>
                        <time dateTime={post.createdAt}>
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </time>
                      </div>
                    </div>
                  </div>
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
                        <Avatar src={comment.author.avatar} alt={comment.author.name} size="sm" />
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
                                  <Avatar src={reply.author.avatar} alt={reply.author.name} size="sm" className="w-6 h-6" />
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
                <div className="flex items-center gap-3 mb-4">
                  <Avatar src={post.author.avatar} alt={post.author.name} size="lg" />
                  <div>
                    <div className="font-bold text-gray-900">{post.author.name}</div>
                    <div className="text-sm text-gray-500">{post.author.handle}</div>
                  </div>
                </div>
                <Button className="w-full">Follow</Button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
