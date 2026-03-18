import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, Users } from 'lucide-react';
import { mockGames } from '../data/mock';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';

export function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const game = mockGames.find(g => g.id === id);

  if (!game) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Game not found</h2>
        <Link to="/games" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Link to="/games" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Gallery
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="aspect-video bg-gray-100 relative overflow-hidden">
            <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3">
              <Badge className="bg-black/60 text-white border-none backdrop-blur-md text-xs font-normal">Demo</Badge>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{game.title}</h1>
                <p className="text-gray-600 leading-relaxed">{game.description}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{game.playCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{game.likes}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Link to={`/user/${game.author.id}`} className="flex items-center gap-3 min-w-0">
                <Avatar src={game.author.avatar} alt={game.author.name} size="md" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{game.author.name}</div>
                  <div className="text-xs text-gray-500 truncate">{game.author.handle}</div>
                </div>
              </Link>

              <div className="flex flex-wrap justify-end gap-2">
                {game.tags.map(tag => (
                  <span key={tag} className="text-[11px] px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
