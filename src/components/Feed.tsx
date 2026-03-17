import { PostCard } from './PostCard';
import { mockPosts } from '../data/mock';

export function Feed() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
