import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';

interface PostCardProps {
  post: {
    id: string;
    author: {
      id: string;
      name: string;
      handle: string;
      avatar: string;
    };
    title: string;
    description: string;
    tags: string[];
    likes: number;
    commentsCount: number;
    createdAt: string;
    viewerHasLiked?: boolean;
    isAiAssisted?: boolean;
  };
}

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate();
  const { user, openModal } = useAuthStore();
  const [likes, setLikes] = useState(post.likes);
  const [viewerHasLiked, setViewerHasLiked] = useState(Boolean(post.viewerHasLiked));
  const [liking, setLiking] = useState(false);

  return (
    <Link to={`/post/${post.id}`} className="block">
      <article className="group relative flex gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-sm hover:border-gray-200 transition-all duration-200">
        <div className="flex-shrink-0">
          <button
            type="button"
            className="rounded-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/user/${post.author.id}`);
            }}
            aria-label={`查看 ${post.author.name} 的主页`}
          >
            <Avatar src={post.author.avatar} alt={post.author.name} size="sm" />
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 text-xs text-gray-500">
            <span className="font-medium text-gray-900">{post.author.name}</span>
            <span>·</span>
            <span>{post.author.handle}</span>
            <span>·</span>
            <time dateTime={post.createdAt}>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</time>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors cursor-pointer leading-tight">
            {post.title}
          </h3>

          <p className="text-sm text-gray-600 mb-2 line-clamp-1 leading-normal">
            {post.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-gray-50 text-xs py-0 px-1.5 h-5 text-gray-600 border border-gray-100">
                  {tag}
                </Badge>
              ))}
              {post.isAiAssisted && (
                <Badge variant="outline" className="text-purple-600 text-xs py-0 px-1.5 h-5 border-purple-100 bg-purple-50">
                  AI
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <Button
                variant="ghost"
                size="sm"
                className={viewerHasLiked ? 'h-6 px-1.5 gap-1 text-purple-600 hover:text-purple-700' : 'h-6 px-1.5 gap-1 text-gray-400 hover:text-gray-900'}
                disabled={liking}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

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
                        .eq('post_id', post.id)
                        .eq('user_id', user.id);
                      if (error) throw error;
                      setViewerHasLiked(false);
                      setLikes(v => Math.max(0, v - 1));
                    } else {
                      const { error } = await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
                      if (error) throw error;
                      setViewerHasLiked(true);
                      setLikes(v => v + 1);
                    }
                  } catch {
                    return;
                  } finally {
                    setLiking(false);
                  }
                }}
              >
                <ThumbsUp className="w-3 h-3" />
                <span className="text-[10px] font-medium">{likes}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-gray-400 hover:text-gray-900">
                <MessageSquare className="w-3 h-3" />
                <span className="text-[10px] font-medium">{post.commentsCount}</span>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
