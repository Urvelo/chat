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

      console.log("✅ Google OAuth käynnistetty:", data);
      
    } catch (error) {
      console.error("❌ Google OAuth epäonnistui:", error);
      setError('Google-kirjautuminen epäonnistui. Yritä uudelleen.');
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
      
      const newUser = {
        uid: 'user-' + Math.random().toString(36).substr(2, 9),
        displayName: name.trim(),
        age: parseInt(age),
        email: `${name.toLowerCase().replace(/\s+/g, '')}@chat-nuorille.local`,
        photoURL: null,
        createdAt: new Date().toISOString()
      };

      console.log("💾 Luodaan käyttäjä (ei tallenneta):", newUser);
      
      console.log("✅ Käyttäjä luotu, asetetaan tilaan");
      
      setUser(newUser);
      
      console.log("🎉 Kirjautuminen valmis, odotetaan siirtymää...");
    } catch (error) {
      console.error('❌ Sisäänkirjautumisvirhe:', error);
      setError('Jotain meni pieleen. Yritä uudelleen.');
    }

    setLoading(false);
  };

  const handleSignOut = () => {
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
        <h1>💬 Aloita chattailu</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="auth-options">
          <button 
            onClick={handleGoogleSignIn}
            className="google-oauth-btn primary-option"
            disabled={googleLoading}
          >
            {googleLoading ? (
              <>
                <span className="loading-spinner-small">⟳</span>
                Kirjaudutaan Google-tilillä...
              </>
            ) : (
              <>
                <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="google-icon" />
                Kirjaudu Google-tilillä
              </>
            )}
          </button>
          
          <div className="google-benefits">
            ✅ Vain 18+ ja Google-käyttäjät voivat lähettää kuvia<br/>
            ✅ Ikä tallennetaan automaattisesti<br/>
            ✅ Turvallisempi käyttökokemus
          </div>

          <div className="auth-divider">
            <span>tai</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Nimimerkki</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kirjoita nimimerkki..."
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
              className="anonymous-btn"
              disabled={loading}
            >
              {loading ? 'Aloitetaan...' : 'Jatka anonyymisti'}
            </button>
            
            <div className="anonymous-note">
              ⚠️ Anonyymit käyttäjät eivät voi lähettää kuvia
            </div>
          </form>
        </div>
        
        <div className="disclaimer">
          <p>Turvallinen ja moderoitu keskustelupalvelu 15+ vuotiaille</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;