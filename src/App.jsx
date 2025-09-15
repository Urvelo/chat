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

  // Lataa käyttäjätiedot localStorage:sta sivun latautuessa - POISTETTU
  useEffect(() => {
    console.log("🔄 Aloitetaan tyhjältä - ei tallennettuja tietoja");
    
    // Aina näytetään kirjautuminen - ei tallenneta tietoja
    setCurrentView('auth');
    setLoading(false);
    console.log("✅ Lataus valmis - kirjautuminen vaaditaan");
  }, []);

  // Kun käyttäjä asetetaan (kirjautuminen), siirry profiilisetupiin
  useEffect(() => {
    console.log("🔄 Tarkistetaan käyttäjän tila:", {
      user: !!user,
      profile: !!profile,
      currentView,
      userDisplayName: user?.displayName
    });
    
    if (user && !profile) {
      console.log("👤 Käyttäjä on kirjautunut mutta ei profiilia, siirtymä profiiliin");
      setCurrentView('profile');
    } else if (user && profile) {
      console.log("✅ Käyttäjä ja profiili OK, siirtymä matchmakeriin");
      setCurrentView('matchmaker');
    }
  }, [user, profile]);

  // Kun profiili on valmis, siirry matchmakeriin
  const handleProfileComplete = (profileData) => {
    console.log("🎯 Profile complete callback kutsuttu:", profileData);
    setProfile(profileData);
    console.log("🎮 Siirtymä matchmakeriin...");
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
      {/* Header ja footer poistettu kokonaan */}
      
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
    </div>
  );
}

export default App;
