import { Gamepad2, ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function FloatingGameButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const isGamesSection = location.pathname.startsWith('/games');

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex">
      {isGamesSection ? (
        <button 
          onClick={() => navigate(-1)}
          className="group flex flex-row-reverse items-center gap-2 bg-white border border-gray-200 shadow-xl py-3 px-3 rounded-l-xl transition-all duration-300 hover:pl-5 hover:pr-4 border-r-0"
          title="返回"
        >
          <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-gray-600 group-hover:text-white transition-colors duration-300 flex-shrink-0">
            <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-white" />
          </div>
          <div className="flex flex-col items-end w-0 overflow-hidden group-hover:w-auto group-hover:mr-1 transition-all duration-300 whitespace-nowrap opacity-0 group-hover:opacity-100">
            <span className="text-sm font-bold text-gray-900">返回</span>
          </div>
        </button>
      ) : (
        <Link 
          to="/games"
          className="group flex flex-row-reverse items-center gap-2 bg-white border border-gray-200 shadow-xl py-3 px-3 rounded-l-xl transition-all duration-300 hover:pl-5 hover:pr-4 border-r-0"
          title="游戏Demo展馆"
        >
          <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300 flex-shrink-0">
            <Gamepad2 className="w-6 h-6 text-purple-600 group-hover:text-white" />
          </div>
          <div className="flex flex-col items-end w-0 overflow-hidden group-hover:w-auto group-hover:mr-1 transition-all duration-300 whitespace-nowrap opacity-0 group-hover:opacity-100">
            <span className="text-xs font-medium text-gray-500 group-hover:text-purple-600">AI Game</span>
            <span className="text-sm font-bold text-gray-900">Demo展馆</span>
          </div>
        </Link>
      )}
    </div>
  );
}
