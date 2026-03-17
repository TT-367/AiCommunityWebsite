import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { FloatingGameButton } from './components/FloatingGameButton';
import { Home } from './pages/Home';
import { PostDetail } from './pages/PostDetail';
import { GameGallery } from './pages/GameGallery';
import { GameDetail } from './pages/GameDetail';
import { UserProfile } from './pages/UserProfile';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans antialiased relative">
        <Header />
        <FloatingGameButton />
        
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
