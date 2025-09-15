import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
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

  // Kuuntele autentikaation tilaa
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (!user) {
        // Käyttäjä kirjautui ulos - nollaa tila
        setProfile(null);
        setCurrentRoom(null);
        setRoomData(null);
        setCurrentView('auth');
      } else {
        // Käyttäjä kirjautui sisään
        setCurrentView('profile');
      }
    });

    return unsubscribe;
  }, []);

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
                <img src={user.photoURL} alt="Profiili" className="user-avatar" />
                <span>{profile?.displayName || user.displayName}</span>
                {profile?.ageGroup && (
                  <span className="age-badge">{profile.ageGroup}</span>
                )}
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
