import { Gamepad2, ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function FloatingGameButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const isGamesSection = location.pathname.startsWith('/games');

  return (
    <div className="fixed right-3 bottom-6 z-50 flex md:hidden">
      {isGamesSection ? (
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 bg-surface border border-border shadow-e3 py-3 px-3 rounded-xl transition-colors"
          title="返回"
        >
          <div className="bg-surface-2 p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 flex-shrink-0">
            <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground whitespace-nowrap">返回</span>
        </button>
      ) : (
        <Link 
          to="/games"
          className="group flex items-center gap-2 bg-surface border border-border shadow-e3 py-3 px-3 rounded-xl transition-colors"
          title="AIGame 展馆"
        >
          <div className="bg-primary/15 p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 flex-shrink-0">
            <Gamepad2 className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground whitespace-nowrap">AIGame</span>
        </Link>
      )}
    </div>
  );
}
