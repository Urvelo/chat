import { useState, useEffect } from 'react';
import Welcome from './components/Welcome';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import Matchmaker from './components/Matchmaker';
import ChatRoom from './components/ChatRoom';
import BannedPage from './components/BannedPage';
import GoogleAuthTest from './components/GoogleAuthTest';
import { cleanupService } from './utils/cleanup-simple';
import { isUserBanned } from './utils/ban-system.js';
import { supabase } from './supabase';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [banStatus, setBanStatus] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('welcome'); // welcome, auth, profile, matchmaker, chat

  // Tarkista onko Google Auth testaus aktiivinen
  const isGoogleAuthTest = window.location.search.includes('test=google-auth');

  // Tarkista onko OAuth callback 
  const urlParams = new URLSearchParams(window.location.search);
  const isOAuthCallback = window.location.hash.includes('access_token') || urlParams.get('oauth_callback') === 'true';

  // Jos Google Auth testaus, näytä se
  if (isGoogleAuthTest) {
    return <GoogleAuthTest />;
  }

  // Jos OAuth callback, käsittele se
  if (isOAuthCallback) {
    // Hook OAuth callback -käsittelyyn
    useEffect(() => {
      const handleOAuthCallback = async () => {
        try {
          console.log('🔄 Käsitellään OAuth callback...');
          console.log('📍 Current hash:', window.location.hash);
          
          // Lyhyempi viive: anna Supabaselle hetki prosessoida hash-parametrit
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Hae session Supabasesta
          console.log('🔍 Haetaan session Supabasesta...');
          const { data, error } = await supabase.auth.getSession();
          
          console.log('📋 Session data:', data);
          console.log('❌ Session error:', error);
          
          if (error) {
            console.error('❌ OAuth callback virhe:', error);
            alert('Kirjautumisvirhe: ' + error.message);
            window.location.href = '/';
            return;
          }

          if (data?.session?.user) {
            console.log('✅ OAuth onnistui, käyttäjä:', data.session.user);
            
            // Muunna Supabase user chattipalvelun käyttäjäksi
            const chatUser = {
              uid: 'google-' + data.session.user.id,
              displayName: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0],
              email: data.session.user.email,
              photoURL: data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture,
              age: null, // Kysytään ProfileSetupissa
              createdAt: new Date().toISOString(),
              isGoogleUser: true
            };

            console.log('✅ Luotu chat-käyttäjä:', chatUser);
            
            // Tallenna käyttäjä sessionStorageen ja ohjaa uudelleen
            sessionStorage.setItem('google_oauth_user', JSON.stringify(chatUser));
            console.log('💾 Tallennettu sessionStorageen, ohjataan...');
            
            // Ohjaa puhtaaseen URL:iin jossa käsitellään OAuth success
            window.location.href = '/?google_oauth_success=true';
            
          } else {
            console.error('❌ Ei käyttäjätietoja OAuth callbackissa');
            console.log('🔍 Session sisältö:', data);
            alert('Ei käyttäjätietoja. Yritä uudelleen.');
            window.location.href = '/';
          }
        } catch (error) {
          console.error('❌ Virhe OAuth callback -käsittelyssä:', error);
          alert('Virhe OAuth-käsittelyssä: ' + error.message);
          window.location.href = '/';
        }
      };

      handleOAuthCallback();
    }, []);

    return (
      <div className="oauth-fullscreen">
        <div className="spinner"></div>
        <h2>� Kirjaudutaan</h2>
        <p>Yhdistetään Google-tiliin...</p>
      </div>
    );
  }

  // Lataa käyttäjätiedot localStorage:sta sivun latautuessa - POISTETTU
  useEffect(() => {
    console.log("🔄 Aloitetaan tyhjältä - ei tallennettuja tietoja");
    
    // Tarkista Google OAuth success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_oauth_success') === 'true') {
      console.log('🎯 Google OAuth success havaittu!');
      
      const savedUser = sessionStorage.getItem('google_oauth_user');
      if (savedUser) {
        try {
          const chatUser = JSON.parse(savedUser);
          console.log('✅ Ladattu Google OAuth käyttäjä:', chatUser);
          
          setUser(chatUser);
          setCurrentView('profile');
          
          // Poista väliaikaiset tiedot
          sessionStorage.removeItem('google_oauth_user');
          
          // Siivoa URL
          window.history.replaceState({}, document.title, '/');
          setLoading(false);
          return;
        } catch (error) {
          console.error('❌ Virhe Google OAuth käyttäjän latauksessa:', error);
        }
      }
    }
    
    // Suorita siivous sovelluksen käynnistyessä (kerran tunnissa)
    const lastCleanup = localStorage.getItem('lastCleanup');
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000; // Muutettu päivästä tuntiin
    
    if (!lastCleanup || (now - parseInt(lastCleanup)) > oneHourMs) {
      console.log('🧹 Suoritetaan tuntikohtainen siivous...');
      cleanupService.performFullCleanup()
        .then(results => {
          console.log('✅ Tuntikohtainen siivous valmis:', results);
          localStorage.setItem('lastCleanup', now.toString());
        })
        .catch(error => {
          console.error('❌ Tuntikohtainen siivous epäonnistui:', error);
        });
    } else {
      console.log('ℹ️ Siivous tehty jo tällä tunnilla, ohitetaan');
    }
    
    // Aina näytetään tervetuloa-sivu - ei tallenneta tietoja
    setCurrentView('welcome');
    setLoading(false);
    console.log("✅ Lataus valmis - tervetuloa-sivu näytetään");
  }, []);

  // Kun käyttäjä asetetaan (kirjautuminen), tarkista banni ja siirry profiilisetupiin
  useEffect(() => {
    const checkUserStatus = async () => {
      console.log("🔄 Tarkistetaan käyttäjän tila:", {
        user: !!user,
        profile: !!profile,
        currentView,
        userDisplayName: user?.displayName
      });
      
      if (user && user.uid) {
        // Tarkista banni-status HETI kirjautumisen jälkeen
        try {
          console.log('🛡️ Tarkistetaan bannia käyttäjälle:', user.uid);
          const userBanStatus = await isUserBanned(user.uid);
          setBanStatus(userBanStatus);
          console.log('🛡️ Banni-status:', userBanStatus);
          
          // Jos bannattu, älä jatka muihin sivuihin
          if (userBanStatus?.banned) {
            console.log('🚫 Käyttäjä on bannattu, näytetään ban-sivu');
            return;
          }
        } catch (error) {
          console.error('❌ Virhe banni-tarkistuksessa:', error);
        }
        
        // Jos ei bannia, jatka normaalisti
        if (!profile) {
          console.log("👤 Käyttäjä on kirjautunut mutta ei profiilia, siirtymä profiiliin");
          setCurrentView('profile');
        } else {
          console.log("✅ Käyttäjä ja profiili OK, siirtymä matchmakeriin");
          setCurrentView('matchmaker');
        }
      }
    };

    checkUserStatus();
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
          <h2>Chat nuorille</h2>
          <p>Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header ja footer poistettu kokonaan */}
      
      {/* Jos käyttäjä on bannattu, näytä vain ban-sivu */}
      {banStatus?.banned && user ? (
        <BannedPage user={user} banInfo={banStatus} />
      ) : (
        /* Pääsisältö */
        <main className="app-main">
          {currentView === 'welcome' && (
            <Welcome onContinue={() => setCurrentView('auth')} />
          )}

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
      )}
    </div>
  );
}

export default App;
