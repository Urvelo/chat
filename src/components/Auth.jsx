import { useState } from 'react';
import { signInWithGoogle } from '../supabase';
import './Auth.css';
import AuthButtons from './AuthButtons';

const Auth = ({ user, setUser }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState('main'); // 'main', 'anonymous-form', 'terms'

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Aloitetaan Google OAuth kirjautuminen...");
      
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        console.error("❌ Google OAuth virhe:", error);
        
        // Spesifimpi error handling
        if (error.message?.includes('popup')) {
          setError('Popup estettiin. Salli popup-ikkunat ja yritä uudelleen.');
        } else if (error.message?.includes('network')) {
          setError('Verkkovirhe. Tarkista internetyhteytesi.');
        } else {
          setError('Google-kirjautuminen epäonnistui: ' + error.message);
        }
        
        setGoogleLoading(false);
        return;
      }

      console.log("✅ Google OAuth käynnistetty:", data);
      
    } catch (error) {
      console.error("❌ Google OAuth epäonnistui:", error);
      setError('Google-kirjautuminen epäonnistui. Yritä uudelleen.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Parannettu input validointi
    const trimmedName = name.trim();
    const numericAge = parseInt(age);

    if (!trimmedName) {
      setError('Nimi on pakollinen');
      setLoading(false);
      return;
    }

    if (trimmedName.length < 2) {
      setError('Nimen täytyy olla vähintään 2 merkkiä');
      setLoading(false);
      return;
    }

    if (trimmedName.length > 30) {
      setError('Nimi ei voi olla yli 30 merkkiä');
      setLoading(false);
      return;
    }

    // XSS-suojaus: vain sallitut merkit
    if (!/^[a-zA-ZäöåÄÖÅ0-9\s\-_\.]+$/.test(trimmedName)) {
      setError('Nimessä voi käyttää vain kirjaimia, numeroita ja perussymboleita');
      setLoading(false);
      return;
    }

    if (!age || isNaN(numericAge)) {
      setError('Ikä täytyy olla numero');
      setLoading(false);
      return;
    }

    if (numericAge < 15) {
      setError('Ikä täytyy olla vähintään 15 vuotta');
      setLoading(false);
      return;
    }

    if (numericAge > 120) {
      setError('Tarkista ikäsi');
      setLoading(false);
      return;
    }

  // Ei erillistä käyttöehtojen sivua anonyymeille: siirry suoraan luomaan käyttäjä
  handleAcceptTerms();
  setLoading(false);
  };

  const handleAcceptTerms = () => {
    try {
      console.log("🚀 Luodaan anonyymi käyttäjä:", name.trim(), "ikä:", age);
      
      const newUser = {
        uid: 'user-' + Math.random().toString(36).substr(2, 9),
        displayName: name.trim(),
        age: parseInt(age),
        email: `${name.toLowerCase().replace(/\s+/g, '')}@chat-nuorille.local`,
        photoURL: null,
        createdAt: new Date().toISOString()
      };

      console.log("✅ Käyttäjä luotu, asetetaan tilaan");
      setUser(newUser);
      
    } catch (error) {
      console.error('❌ Sisäänkirjautumisvirhe:', error);
      setError('Jotain meni pieleen. Yritä uudelleen.');
    }
  };

  const handleSignOut = () => {
    setUser(null);
  };

  const handleAnonymousClick = () => setStep('anonymous-form');

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

  // Käyttöehdot sivu
  if (step === 'terms') {
    return (
      <div className="auth-container">
        <div className="login-box">
          <h1>� Käyttöehdot</h1>
          
          <div className="terms-content">
            <h3>Tervetuloa chattiin!</h3>
            <p>Käyttämällä palvelua sitoudut noudattamaan seuraavia sääntöjä:</p>
            
            <ul>
              <li>🚫 Ei kiusaamista, haukkumista tai uhkailua</li>
              <li>🚫 Ei sopimatonta sisältöä (väkivalta, seksi, huumeet)</li>
              <li>🚫 Ei henkilötietojen jakamista</li>
              <li>🚫 Ei roskapostia tai mainontaa</li>
              <li>✅ Ole kohtelias ja kunnioita muita</li>
              <li>✅ Pidä keskustelu asiallisena</li>
            </ul>
            
            <p><strong>Muista:</strong> Kaikki viestit moderoidaan automaattisesti. Sääntörikkomukset voivat johtaa varoituksiin tai porttikieltoon.</p>
          </div>
          
          <div className="terms-buttons">
            <button 
              onClick={() => setStep('anonymous-form')}
              className="back-btn"
            >
              ← Takaisin
            </button>
            <button 
              onClick={handleAcceptTerms}
              className="accept-terms-btn"
            >
              Hyväksyn ehdot ja aloitan chatin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Anonyymi lomake
  if (step === 'anonymous-form') {
    return (
      <div className="auth-container">
        <div className="login-box">
          <h1>👤 Anonyymi kirjautuminen</h1>
          
          {error && <div className="error-message">{error}</div>}
          
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

            <div className="form-buttons">
              <button 
                type="button"
                onClick={() => setStep('main')}
                className="back-btn"
              >
                ← Takaisin
              </button>
              <button 
                type="submit" 
                className="continue-btn"
                disabled={loading}
              >
                {loading ? 'Ladataan...' : 'Jatka →'}
              </button>
            </div>
            
            <div className="anonymous-note">
              ⚠️ Anonyymit käyttäjät eivät voi lähettää kuvia
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Pääsivu - 2 nappia
  return (
    <div className="auth-container">
      <div className="login-box">
        <h1>💬 Aloita chattailu</h1>
        
        {/* Loading overlay Google OAuth:n aikana */}
        {googleLoading && (
          <div className="oauth-loading-overlay">
            <div className="oauth-loading-content">
              <div className="spinner"></div>
              <h3>🔐 Kirjaudutaan Google-tilillä</h3>
              <p>Ohjataan Google-kirjautumiseen...</p>
            </div>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <AuthButtons onGoogleClick={handleGoogleSignIn} onAnonymousClick={handleAnonymousClick} />
        
        <div className="disclaimer">
          <p>Turvallinen keskustelupalvelu 15+ vuotiaille</p>
          <p className="feature-note">🔒 Vain 18+ Google-käyttäjät voivat lähettää kuvia</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;