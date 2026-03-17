import { Bell } from 'lucide-react';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight mr-4">
            <span className="bg-black text-white px-2 py-1 rounded-md">AI</span>
            <span>AiGo</span>
          </a>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-black transition-colors">Discover</a>
            <a href="#" className="hover:text-black transition-colors">Topics</a>
            <a href="#" className="hover:text-black transition-colors">Collections</a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Bell className="w-5 h-5" />
          </Button>
          <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" alt="User" size="sm" />
        </div>
      </div>
    </header>
  );
}
