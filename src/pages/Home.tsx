import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Gamepad2, FileText, Plus } from 'lucide-react';
import { Feed } from '../components/Feed';
import { HeroSearch, type HomeTab } from '../components/HeroSearch';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { mockGames, mockPosts } from '../data/mock';

export function Home() {
  const [activeTab, setActiveTab] = useState<HomeTab>('hot');

  const topics = [
    'RAG', 'Agent', 'Prompt Engineering', 'Local LLM', 'Fine-tuning', 'Vector DB', 'Inference', 'Eval'
  ];

  const developerLeaderboard = useMemo(() => {
    const authorMap = new Map<string, { id: string; name: string; handle: string; avatar: string }>();
    for (const post of mockPosts) authorMap.set(post.author.id, post.author);
    for (const game of mockGames) authorMap.set(game.author.id, game.author);

    const getPostsByAuthor = (authorId: string) => mockPosts.filter(p => p.author.id === authorId);
    const getGamesByAuthor = (authorId: string) => mockGames.filter(g => g.author.id === authorId);

    const developers = Array.from(authorMap.values()).map(author => {
      const posts = getPostsByAuthor(author.id);
      const games = getGamesByAuthor(author.id);
      const postsSorted = [...posts].sort((a, b) => b.likes - a.likes);
      const gamesSorted = [...games].sort((a, b) => b.likes - a.likes);
      const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0) + games.reduce((sum, g) => sum + g.likes, 0);

      return {
        author,
        totalLikes,
        totalPosts: posts.length,
        totalGames: games.length,
        topPost: postsSorted[0],
        topGame: gamesSorted[0],
      };
    });

    return developers.sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 10);
  }, []);

  return (
    <main className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Left Sidebar - Navigation (Hidden on mobile) */}
      <aside className="hidden md:block col-span-2 sticky top-24 h-[calc(100vh-6rem)]">
        <nav className="space-y-1">
          <Button variant="ghost" className="w-full justify-start font-semibold text-black bg-gray-100">
            话题分享
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600">
            AIGame demo展馆
          </Button>
        </nav>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-4">My Topics</h3>
          <div className="space-y-1">
            {topics.slice(0, 4).map(topic => (
               <Button key={topic} variant="ghost" size="sm" className="w-full justify-start text-gray-600 font-normal">
                 # {topic}
               </Button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content - Feed */}
      <section className="col-span-1 md:col-span-7">
        <HeroSearch activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'developers' ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-gray-900">开发者排行榜</div>
                <div className="text-xs text-gray-500 mt-1">前 10 名开发者：累计获赞 / 发帖 / 游戏项目</div>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {developerLeaderboard.map((dev, idx) => {
                return (
                  <div key={dev.author.id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 flex-shrink-0 text-sm font-bold text-gray-400">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Link to={`/user/${dev.author.id}`} className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 block">
                              <img src={dev.author.avatar} alt={dev.author.name} className="w-full h-full object-cover" />
                            </Link>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{dev.author.name}</div>
                                <div className="text-xs text-gray-400 truncate">{dev.author.handle}</div>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5" />
                                  <span className="font-medium text-gray-700">{dev.totalLikes.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{dev.totalPosts}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Gamepad2 className="w-3.5 h-3.5" />
                                  <span>{dev.totalGames}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Link to={`/user/${dev.author.id}`} className="flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-gray-600 hover:text-gray-900 gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              查看更多
                            </Button>
                          </Link>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0 bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                            <div className="text-[11px] font-semibold text-gray-700 mb-1">受欢迎 · 帖子</div>
                            {dev.topPost ? (
                              <Link to={`/post/${dev.topPost.id}`} className="block">
                                <div className="text-xs font-semibold text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors">
                                  {dev.topPost.title}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5">👍 {dev.topPost.likes.toLocaleString()}</div>
                              </Link>
                            ) : (
                              <div className="text-xs text-gray-400">暂无</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                            <div className="text-[11px] font-semibold text-gray-700 mb-1">受欢迎 · 游戏</div>
                            {dev.topGame ? (
                              <Link to={`/games/${dev.topGame.id}`} className="block">
                                <div className="text-xs font-semibold text-gray-900 line-clamp-1 hover:text-purple-600 transition-colors">
                                  {dev.topGame.title}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5">👍 {dev.topGame.likes.toLocaleString()}</div>
                              </Link>
                            ) : (
                              <div className="text-xs text-gray-400">暂无</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Feed />
        )}
      </section>

      {/* Right Sidebar - Trending & Info (Hidden on mobile) */}
      <aside className="hidden md:block col-span-3 sticky top-24 h-fit space-y-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Trending Topics</h3>
          <div className="flex flex-wrap gap-2">
            {topics.map(topic => (
              <Badge key={topic} variant="secondary" className="cursor-pointer hover:bg-gray-200">
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        <div className="bg-black text-white rounded-xl p-5 shadow-lg">
          <h3 className="font-bold text-lg mb-2">AiGo Community</h3>
          <p className="text-gray-300 text-sm mb-4">
            A space for AI engineers to share practical insights, code, and benchmarks.
          </p>
          <Button className="w-full bg-white text-black hover:bg-gray-100 font-semibold">
            Start Contributing
          </Button>
        </div>
        
        <footer className="text-xs text-gray-400 px-2">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="#" className="hover:text-gray-600">About</a>
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
            <a href="#" className="hover:text-gray-600">API</a>
            <span>© 2026 AiGo</span>
          </div>
        </footer>
      </aside>
    </main>
  );
}
