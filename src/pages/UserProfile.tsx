import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Gamepad2, Heart } from 'lucide-react';
import { mockGames, mockPosts } from '../data/mock';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const authorId = id ?? '';

  const posts = mockPosts.filter(p => p.author.id === authorId).sort((a, b) => b.likes - a.likes);
  const games = mockGames.filter(g => g.author.id === authorId).sort((a, b) => b.likes - a.likes);

  const author = posts[0]?.author ?? games[0]?.author;
  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0) + games.reduce((sum, g) => sum + g.likes, 0);

  if (!author) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto px-4 py-12 text-center max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
          <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="sticky top-[4.5rem] z-40 -mx-4 px-4 py-2 bg-[#F9FAFB]/90 supports-[backdrop-filter]:bg-[#F9FAFB]/70 backdrop-blur border-b border-gray-100">
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar src={author.avatar} alt={author.name} size="lg" />
                <div className="min-w-0">
                  <div className="text-xl font-bold text-gray-900 truncate">{author.name}</div>
                  <div className="text-sm text-gray-500 truncate">{author.handle}</div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span className="font-semibold text-gray-900">{totalLikes.toLocaleString()}</span>
                      <span className="text-gray-500">获赞</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span className="font-semibold text-gray-900">{posts.length}</span>
                      <span className="text-gray-500">发帖</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gamepad2 className="w-4 h-4" />
                      <span className="font-semibold text-gray-900">{games.length}</span>
                      <span className="text-gray-500">游戏</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="flex-shrink-0" variant="secondary">
                Follow
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-bold text-gray-900">帖子</div>
              <div className="text-xs text-gray-500 mt-1">按点赞排序</div>
            </div>
            <div className="divide-y divide-gray-50">
              {posts.length > 0 ? (
                posts.slice(0, 10).map(p => (
                  <Link key={p.id} to={`/post/${p.id}`} className="block px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 line-clamp-1">{p.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{p.description}</div>
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0">👍 {p.likes.toLocaleString()}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-gray-400">暂无帖子</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="font-bold text-gray-900">游戏项目</div>
              <div className="text-xs text-gray-500 mt-1">按点赞排序</div>
            </div>
            <div className="divide-y divide-gray-50">
              {games.length > 0 ? (
                games.slice(0, 10).map(g => (
                  <Link key={g.id} to={`/games/${g.id}`} className="block px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 line-clamp-1">{g.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{g.description}</div>
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0">👍 {g.likes.toLocaleString()}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-gray-400">暂无游戏</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
