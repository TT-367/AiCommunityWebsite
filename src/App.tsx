import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { FloatingPostButton } from './components/FloatingPostButton';
import { AuthModal } from './components/AuthModal';
import { useAuthStore } from './stores/authStore';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { GameGallery } from './pages/GameGallery';
import { GameDetail } from './pages/GameDetail';
import { UserProfile } from './pages/UserProfile';
import { ToolchainPage } from './pages/ToolchainPage';
import { SkillDetail } from './pages/SkillDetail';
import { AssetStorePage } from './pages/AssetStorePage';
import { EventsPage } from './pages/EventsPage';
import { MyAssetsPage } from './pages/MyAssetsPage';
import { ProjectSpacePage } from './pages/ProjectSpacePage';

import { Workspace } from './pages/Workspace';

function AppLayout() {
  const location = useLocation();
  const isWorkspace = location.pathname.startsWith('/workspace');
  const hidePostButton = location.pathname === '/' || isWorkspace;

  if (isWorkspace) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <AuthModal />
        <Routes>
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">

        <div
          className="absolute inset-0 opacity-95"
          style={{
            backgroundImage:
              'radial-gradient(900px circle at 18% -10%, rgba(var(--brand-2) / 0.22), transparent 60%), radial-gradient(700px circle at 82% 0%, rgba(var(--brand-3) / 0.18), transparent 62%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
      </div>
      <Header />
      {!hidePostButton && <FloatingPostButton />}
      <AuthModal />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project-space" element={<ProjectSpacePage />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/assets" element={<AssetStorePage />} />
        <Route path="/my-assets" element={<MyAssetsPage />} />
        <Route path="/games" element={<GameGallery />} />
        <Route path="/games/:id" element={<GameDetail />} />
        <Route path="/skills/:id" element={<SkillDetail />} />
        <Route path="/toolchain" element={<ToolchainPage />} />
        <Route path="/user/:id" element={<UserProfile />} />
        <Route path="/events" element={<EventsPage />} />
      </Routes>
    </div>
  );
}

function App() {
  const initAuth = useAuthStore(s => s.init);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
