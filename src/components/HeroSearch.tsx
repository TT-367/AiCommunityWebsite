import { Search, Hash } from 'lucide-react';
import { Button } from './ui/Button';

export type HomeTab = 'hot' | 'latest' | 'developers';

interface HeroSearchProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}

export function HeroSearch({ activeTab, onTabChange }: HeroSearchProps) {
  return (
    <div className="sticky top-[4.5rem] z-40 mb-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center relative overflow-hidden backdrop-blur-sm bg-white/95 supports-[backdrop-filter]:bg-white/80">
      {/* Background decoration (optional/subtle) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />
      
      <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-4 tracking-tight">
        AI创造游戏梦想
      </h1>

      <div className="max-w-xl mx-auto relative mb-4 group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-9 pr-20 py-2 bg-gray-50 border border-gray-200 rounded-full text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:bg-white hover:shadow-md"
          placeholder="搜索话题、帖子或用户..."
        />
        {/* Right-side filter button integrated into the input */}
        <div className="absolute inset-y-0 right-1 flex items-center">
          <Button variant="ghost" size="sm" className="h-7 rounded-full px-3 text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-xs font-medium gap-1">
             <Hash className="w-3 h-3" /> 标签
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center border-t border-gray-100 pt-3 gap-6 text-sm font-medium text-gray-500">
        <button
          className={
            activeTab === 'hot'
              ? "text-green-600 relative after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-0.5 after:bg-green-600 font-bold whitespace-nowrap px-2"
              : "hover:text-gray-900 transition-colors whitespace-nowrap px-2"
          }
          onClick={() => onTabChange('hot')}
          type="button"
        >
          热门
        </button>
        <button
          className={
            activeTab === 'latest'
              ? "text-green-600 relative after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-0.5 after:bg-green-600 font-bold whitespace-nowrap px-2"
              : "hover:text-gray-900 transition-colors whitespace-nowrap px-2"
          }
          onClick={() => onTabChange('latest')}
          type="button"
        >
          最新
        </button>
        <button
          className={
            activeTab === 'developers'
              ? "text-green-600 relative after:absolute after:bottom-[-13px] after:left-0 after:w-full after:h-0.5 after:bg-green-600 font-bold whitespace-nowrap px-2"
              : "hover:text-gray-900 transition-colors whitespace-nowrap px-2"
          }
          onClick={() => onTabChange('developers')}
          type="button"
        >
          开发者排行榜
        </button>
      </div>
    </div>
  );
}
