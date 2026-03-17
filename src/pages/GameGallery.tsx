import { ThumbsUp, Users, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockGames } from '../data/mock';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';

export function GameGallery() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Navigation / Search Bar */}
        <div className="mb-4 flex items-center justify-end">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search games..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-300 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-xl md:text-3xl font-bold mb-2">AI Game Demo Gallery</h1>
            <p className="text-purple-100 text-sm md:text-base mb-4">
              Explore innovative games created with AI technology. Play, rate, and get inspired by the community's creations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 border-none font-semibold px-4 py-2 h-auto text-sm">
                Submit Your Game
              </Button>
              <Button variant="outline" className="border-purple-300 text-white hover:bg-purple-700/50 px-4 py-2 h-auto text-sm">
                How It Works
              </Button>
            </div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {mockGames.map(game => (
            <Link
              key={game.id}
              to={`/games/${game.id}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Top Thumbnail */}
              <div className="w-full aspect-video bg-gray-100 relative overflow-hidden flex-shrink-0">
                <img 
                  src={game.thumbnail} 
                  alt={game.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-black/60 text-white border-none backdrop-blur-md text-xs font-normal">
                    Demo
                  </Badge>
                </div>
              </div>

              {/* Bottom Content */}
              <div className="p-4 flex flex-col z-10 bg-white relative flex-grow">
                {/* Developer Info & Stats */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={game.author.avatar} alt={game.author.name} size="sm" className="w-6 h-6" />
                    <span className="text-xs text-gray-600 truncate font-medium">{game.author.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1" title="Views">
                      <Users className="w-3.5 h-3.5" />
                      <span>{game.playCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Likes">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{game.likes}</span>
                    </div>
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                  {game.title}
                </h3>
                
                {/* Expandable Description */}
                <div className="max-h-[1.2rem] group-hover:max-h-32 overflow-hidden transition-[max-height] duration-500 ease-in-out">
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {game.description}
                  </p>
                </div>

                <div className="mt-auto pt-2 flex flex-wrap gap-2">
                  {game.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
