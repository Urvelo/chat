import { useState } from 'react';

const Auth = ({ user, setUser }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!name.trim()) {
      setError('Nimi on pakollinen');
      setLoading(false);
      return;
    }

    if (!age || age < 15 || age > 20) {
      setError('Ikä täytyy olla 15-20 vuotta');
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
        email: `${name.toLowerCase().replace(/\s+/g, '')}@chatnest.local`,
        photoURL: null,
        createdAt: new Date().toISOString()
      };

      console.log("💾 Tallennetaan käyttäjä:", newUser);
      
      // Tallenna localStorage
      localStorage.setItem('chatnest-user', JSON.stringify(newUser));
      
      console.log("✅ Käyttäjä tallennettu, asetetaan tilaan");
      
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
    localStorage.removeItem('chatnest-user');
    localStorage.removeItem('chatnest-profile');
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
        <h1>💬 ChatNest</h1>
        <p>Aloita chattailu satunnaisten ihmisten kanssa</p>
        
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
              max="20"
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
        
        <div className="disclaimer">
          <p>Käyttämällä palvelua hyväksyt käyttöehtomme. Käyttäydymme vastuullisesti!</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;