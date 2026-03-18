import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { FloatingGameButton } from './components/FloatingGameButton';
import { FloatingPostButton } from './components/FloatingPostButton';
import { AuthModal } from './components/AuthModal';
import { useAuthStore } from './stores/authStore';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { GameGallery } from './pages/GameGallery';
import { GameDetail } from './pages/GameDetail';
import { UserProfile } from './pages/UserProfile';

function App() {
  const initAuth = useAuthStore(s => s.init);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Router>
      <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans antialiased relative overflow-x-hidden">
        <Header />
        <FloatingGameButton />
        <FloatingPostButton />
        <AuthModal />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/games" element={<GameGallery />} />
          <Route path="/games/:id" element={<GameDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
