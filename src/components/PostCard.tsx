import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, MessageSquare, ThumbsUp } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../stores/authStore';
import { FORCE_MOCK_POSTS } from '../config/featureFlags';

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
    linkedSkillId?: string | null;
    linkedGameId?: string | null;
    viewerHasLiked?: boolean;
    isAiAssisted?: boolean;
  };
  isHot?: boolean;
}

export function PostCard({ post, isHot }: PostCardProps) {
  const navigate = useNavigate();
  const { user, openModal } = useAuthStore();
  const [likes, setLikes] = useState(post.likes);
  const [viewerHasLiked, setViewerHasLiked] = useState(Boolean(post.viewerHasLiked));
  const [liking, setLiking] = useState(false);

  return (
    <Link to={`/post/${post.id}`} className="block">
      <article className="group relative flex gap-3 p-4 bg-surface border border-border rounded-lg hover:shadow-e1 hover:border-border-strong transition-all duration-200">
        {isHot && (
          <div className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/10 border border-warning/20 text-warning">
            <Flame className="w-4 h-4" />
          </div>
        )}
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
          <div className="flex items-center gap-2 mb-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{post.author.name}</span>
            <span>·</span>
            <span>{post.author.handle}</span>
            <span>·</span>
            <time dateTime={post.createdAt}>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</time>
          </div>

          <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors cursor-pointer leading-tight">
            {post.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-2 line-clamp-1 leading-normal">
            {post.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-surface-2 text-xs py-0 px-1.5 h-5 text-muted-foreground border border-border">
                  {tag}
                </Badge>
              ))}
              {post.isAiAssisted && (
                <Badge variant="outline" className="text-primary text-xs py-0 px-1.5 h-5 border-primary/20 bg-primary/10">
                  AI
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className={viewerHasLiked ? 'h-6 px-1.5 gap-1 text-primary hover:text-primary' : 'h-6 px-1.5 gap-1 text-muted-foreground hover:text-foreground'}
                disabled={liking}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (FORCE_MOCK_POSTS) {
                    if (viewerHasLiked) {
                      setViewerHasLiked(false);
                      setLikes(v => Math.max(0, v - 1));
                    } else {
                      setViewerHasLiked(true);
                      setLikes(v => v + 1);
                    }
                    return;
                  }

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
              <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-muted-foreground hover:text-foreground">
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
