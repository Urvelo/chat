import { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const Auth = ({ user, setUser }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error('Kirjautumisvirhe:', error);
      setError('Kirjautuminen epäonnistui. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Uloskirjautumisvirhe:', error);
      setError('Uloskirjautuminen epäonnistui.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          <img src={user.photoURL} alt="Profiili" className="profile-image" />
          <p>Tervetuloa, {user.displayName}!</p>
          <button 
            onClick={handleSignOut} 
            disabled={loading}
            className="sign-out-btn"
          >
            {loading ? 'Kirjaudutaan ulos...' : 'Kirjaudu ulos'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="login-box">
        <h1>🔥 ChatNest</h1>
        <p>Turvallinen satunnainen chat - aloita keskustelu!</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          onClick={signInWithGoogle} 
          disabled={loading}
          className="google-sign-in-btn"
        >
          {loading ? 'Kirjaudutaan...' : '🔐 Kirjaudu Google-tilillä'}
        </button>
        
        <div className="disclaimer">
          <p>Kirjautumalla hyväksyt käyttöehtomme. Käyttäydymme vastuullisesti!</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;