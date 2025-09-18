import { useState, useEffect } from 'react';
import { signInWithGoogle, signOut, onAuthStateChange } from '../supabase';

const GoogleAuthTest = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Kuuntele auth-tilan muutoksia
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('🔄 Auth tila muuttui:', event, session);
      
      if (session?.user) {
        setUser(session.user);
        console.log('👤 Käyttäjä kirjautunut:', {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
          avatar: session.user.user_metadata?.avatar_url
        });
      } else {
        setUser(null);
        console.log('👤 Ei kirjautunutta käyttäjää');
      }
      
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Kirjautumisvirhe:', error);
      alert(`Kirjautumisvirhe: ${error.message}`);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Uloskirjautumisvirhe:', error);
      alert(`Uloskirjautumisvirhe: ${error.message}`);
    }
    setAuthLoading(false);
  };

  if (loading) {
    return (
      <div className="auth-test-container">
        <div className="loading">
          🔄 Ladataan auth-tilaa...
        </div>
      </div>
    );
  }

  return (
    <div className="auth-test-container">
      <div className="auth-test-box">
        <h2>🧪 Google Auth Testaus</h2>
        
        {user ? (
          <div className="user-info">
            <h3>✅ Kirjautunut käyttäjä:</h3>
            <div className="user-details">
              <img 
                src={user.user_metadata?.avatar_url} 
                alt="Avatar" 
                className="user-avatar"
              />
              <div className="user-text">
                <p><strong>Nimi:</strong> {user.user_metadata?.full_name || 'Ei nimeä'}</p>
                <p><strong>Sähköposti:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Luotu:</strong> {new Date(user.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              disabled={authLoading}
              className="auth-btn logout-btn"
            >
              {authLoading ? '🔄 Kirjaudutaan ulos...' : '🚪 Kirjaudu ulos'}
            </button>
          </div>
        ) : (
          <div className="login-section">
            <h3>🔐 Kirjaudu sisään testataksesi</h3>
            <p>Testaa Google OAuth Supabase:n kautta</p>
            
            <button 
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="auth-btn google-btn"
            >
              {authLoading ? '🔄 Kirjaudutaan...' : '🔍 Kirjaudu Googlella'}
            </button>
          </div>
        )}
        
        <div className="test-info">
          <h4>📋 Testattavat asiat:</h4>
          <ul>
            <li>✅ Google OAuth popup aukeaa</li>
            <li>✅ Käyttäjätiedot näkyvät oikein</li>
            <li>✅ Redirect toimii localhost:ssa</li>
            <li>✅ Uloskirjautuminen toimii</li>
            <li>✅ Auth-tila päivittyy reaaliajassa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthTest;