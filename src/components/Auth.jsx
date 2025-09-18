import { useState } from 'react';
import { signInWithGoogle } from '../supabase';

const Auth = ({ user, setUser }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Aloitetaan Google OAuth kirjautuminen...");
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        console.error("❌ Google OAuth virhe:", error);
        setError('Google-kirjautuminen epäonnistui: ' + error.message);
        return;
      }

      if (data?.user) {
        console.log("✅ Google OAuth onnistui:", data.user);
        
        // Muunna Supabase user chattipalvelun käyttäjäksi
        const chatUser = {
          uid: 'google-' + data.user.id,
          displayName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
          email: data.user.email,
          photoURL: data.user.user_metadata?.avatar_url,
          age: null, // Kysytään erikseen
          createdAt: new Date().toISOString(),
          isGoogleUser: true
        };

        console.log("🔄 Luotu chat-käyttäjä Google-datasta:", chatUser);
        setUser(chatUser);
      }
    } catch (error) {
      console.error("❌ Google OAuth epäonnistui:", error);
      setError('Google-kirjautuminen epäonnistui. Yritä uudelleen.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!name.trim()) {
      setError('Nimi on pakollinen');
      setLoading(false);
      return;
    }

    if (!age || age < 15) {
      setError('Ikä täytyy olla vähintään 15 vuotta');
      setLoading(false);
      return;
    }

    try {
      console.log("🚀 Aloitetaan kirjautuminen:", name.trim(), "ikä:", age);
      
      // Luo yksinkertainen käyttäjäobjekti
      const newUser = {
        uid: 'user-' + Math.random().toString(36).substr(2, 9),
        displayName: name.trim(),
        age: parseInt(age),
        email: `${name.toLowerCase().replace(/\s+/g, '')}@chat-nuorille.local`,
        photoURL: null,
        createdAt: new Date().toISOString()
      };

      console.log("💾 Luodaan käyttäjä (ei tallenneta):", newUser);
      
      // EI tallenneta localStorage:iin - aina kysytään uudestaan
      
      console.log("✅ Käyttäjä luotu, asetetaan tilaan");
      
      // Aseta käyttäjä - tämä laukaisee siirtymän App.jsx:ssä
      setUser(newUser);
      
      console.log("🎉 Kirjautuminen valmis, odotetaan siirtymää...");
    } catch (error) {
      console.error('❌ Sisäänkirjautumisvirhe:', error);
      setError('Jotain meni pieleen. Yritä uudelleen.');
    }

    setLoading(false);
  };

  const handleSignOut = () => {
    // Poistetaan vain muistista - ei localStorage:ia
    setUser(null);
  };

  if (user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          <div className="profile-image">👤</div>
          <p>Tervetuloa, {user.displayName}!</p>
          <p>Ikä: {user.age} vuotta</p>
          <button 
            onClick={handleSignOut} 
            className="sign-out-btn"
          >
            Kirjaudu ulos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="login-box">
        <h1>💬 Chat nuorille</h1>
        <p>Täytä tiedot. Älä valehtele ikääsi!</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Nimesi</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kirjoita nimesi..."
              maxLength="30"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">Ikäsi</label>
            <input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Kirjoita ikäsi..."
              min="15"
              required
            />
          </div>

          <button 
            type="submit" 
            className="google-sign-in-btn"
            disabled={loading}
          >
            {loading ? 'Aloitetaan...' : '🚀 Aloita chattailu'}
          </button>
        </form>

        <div className="auth-divider">
          <span>tai</span>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="google-oauth-btn"
          disabled={googleLoading}
        >
          {googleLoading ? (
            <>
              <span className="loading-spinner-small">⟳</span>
              Kirjaudutaan...
            </>
          ) : (
            <>
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="google-icon" />
              Jatka Google-tilillä
            </>
          )}
        </button>
        
        <div className="disclaimer">
          <p>Käyttämällä palvelua hyväksyt käyttöehtomme. Käyttäydymme vastuullisesti!</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;