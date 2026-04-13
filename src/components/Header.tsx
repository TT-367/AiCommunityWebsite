import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { useAuthStore } from '../stores/authStore';

export function Header() {
  const { user, openModal, signOut } = useAuthStore();
  const avatarSrc = user?.user_metadata?.avatar_url
    ? String(user.user_metadata.avatar_url)
    : user
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
      : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest';
  const displayName = user?.user_metadata?.display_name
    ? String(user.user_metadata.display_name)
    : user?.email
      ? user.email.split('@')[0]
      : 'User';

  return (
    <header className="sticky top-0 z-50 w-full bg-surface border-b border-border shadow-e1 supports-[backdrop-filter]:bg-surface/80 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-14 2xl:px-20 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex flex-col leading-tight mr-2">
            <span className="text-xl font-bold text-foreground tracking-tight">AiGo</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide hidden lg:block mt-0.5">一站式游戏开发平台</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-2.5 ml-4">
            <Link to="/?tab=hot" className="h-8 px-4 rounded-full border border-border/40 bg-transparent text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-surface-2/40 transition-all flex items-center justify-center">
              开发者社区
            </Link>
            <Link to="/assets" className="h-8 px-4 rounded-full border border-border/40 bg-transparent text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-surface-2/40 transition-all flex items-center justify-center">
              资产商店
            </Link>
            <Link to="/project-space" className="h-8 px-4 rounded-full border border-border/40 bg-transparent text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-surface-2/40 transition-all flex items-center justify-center">
              工作空间
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              to="/events"
              className="h-8 px-4 rounded-full border border-border/80 bg-surface-2/40 text-[13px] font-medium text-foreground transition-all flex items-center justify-center hover:bg-surface-2"
            >
              最新活动
            </Link>
            <button className="h-8 px-4 rounded-full border border-border/40 bg-transparent text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-surface-2/40 transition-all flex items-center justify-center cursor-default">
              价格方案
            </button>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to={`/user/${user.id}`} className="block">
                <Avatar src={avatarSrc} alt={displayName} size="sm" />
              </Link>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => signOut()}>
                退出
              </Button>
            </div>
          ) : (
            <button
              className="relative h-7 rounded-full px-3.5 text-[12px] font-semibold text-foreground shadow-e2 overflow-hidden border border-border/60 bg-[linear-gradient(180deg,#3b82f6_0%,#2563eb_55%,#1d4ed8_100%)] hover:bg-[linear-gradient(180deg,#4f8ff7_0%,#2f73f0_55%,#2156de_100%)] before:absolute before:inset-0 before:pointer-events-none before:bg-[radial-gradient(120px_circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)] before:opacity-70 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => openModal('signIn')}
            >
              免费使用
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
