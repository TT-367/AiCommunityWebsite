import { Gamepad2, ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function FloatingGameButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const isGamesSection = location.pathname.startsWith('/games');

  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 flex md:hidden">
      {isGamesSection ? (
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 bg-white border border-gray-200 shadow-xl py-3 px-3 rounded-xl transition-colors"
          title="返回"
        >
          <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-gray-600 group-hover:text-white transition-colors duration-300 flex-shrink-0">
            <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">返回</span>
        </button>
      ) : (
        <Link 
          to="/games"
          className="group flex items-center gap-2 bg-white border border-gray-200 shadow-xl py-3 px-3 rounded-xl transition-colors"
          title="AIGame demo展馆"
        >
          <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300 flex-shrink-0">
            <Gamepad2 className="w-6 h-6 text-purple-600 group-hover:text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">AIGame</span>
        </Link>
      )}
    </div>
  );
}
