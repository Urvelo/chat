import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import Matchmaker from './components/Matchmaker';
import ChatRoom from './components/ChatRoom';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('auth'); // auth, profile, matchmaker, chat

  // Lataa käyttäjätiedot localStorage:sta sivun latautuessa
  useEffect(() => {
    const savedUser = localStorage.getItem('chatnest-user');
    const savedProfile = localStorage.getItem('chatnest-profile');
    
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        setCurrentView('matchmaker');
      } else {
        setCurrentView('profile');
      }
    } else {
      setCurrentView('auth');
    }
    
    setLoading(false);
  }, []);

  // Kun käyttäjä asetetaan (kirjautuminen), siirry profiilisetupiin
  useEffect(() => {
    if (user && !profile) {
      setCurrentView('profile');
    }
  }, [user, profile]);

  // Kun profiili on valmis, siirry matchmakeriin
  const handleProfileComplete = (profileData) => {
    setProfile(profileData);
    setCurrentView('matchmaker');
  };

  // Kun huone on liitetty, siirry chattiin
  const handleRoomJoined = (roomId, roomData) => {
    setCurrentRoom(roomId);
    setRoomData(roomData);
    setCurrentView('chat');
  };

  // Poistu huoneesta ja palaa matchmakeriin
  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setRoomData(null);
    setCurrentView('matchmaker');
  };

  // Näytä latausruutu
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner">🔄</div>
          <h2>ChatNest</h2>
          <p>Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🔥 ChatNest</h1>
          <div className="header-info">
            {user && (
              <div className="user-badge">
                <div className="user-avatar">👤</div>
                <span>{user.displayName}</span>
                <span className="age-badge">{user.age}v</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Pääsisältö */}
      <main className="app-main">
        {currentView === 'auth' && (
          <Auth user={user} setUser={setUser} />
        )}

        {currentView === 'profile' && user && (
          <ProfileSetup 
            user={user} 
            onProfileComplete={handleProfileComplete}
          />
        )}

        {currentView === 'matchmaker' && user && profile && (
          <Matchmaker 
            user={user}
            profile={profile}
            onRoomJoined={handleRoomJoined}
          />
        )}

        {currentView === 'chat' && user && profile && currentRoom && (
          <ChatRoom
            user={user}
            profile={profile}
            roomId={currentRoom}
            roomData={roomData}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>🛡️ Turvallinen chat • 🔒 Yksityisyys suojattu • 🚩 Raportoi väärinkäyttö</p>
          <div className="footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Käyttöehdot</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Tietosuoja</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Tuki</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
