import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, db } from '../firebase';
import { getCachedFingerprint } from '../utils/fingerprint';

const ProfileSetup = ({ user, onProfileComplete }) => {
  const [profile, setProfile] = useState({
    termsAccepted: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Tarkista onko profiili jo olemassa
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        // Tarkista localStorage:sta ensin
        const savedProfile = localStorage.getItem('chatnest-profile');
        if (savedProfile) {
          const userData = JSON.parse(savedProfile);
          setProfile(userData);
          onProfileComplete(userData);
          return;
        }

        // Tarkista Firestore:sta
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setProfile(userData);
          localStorage.setItem('chatnest-profile', JSON.stringify(userData));
          onProfileComplete(userData);
        }
      } catch (error) {
        console.error('Virhe profiilin tarkistuksessa:', error);
        setError('Profiilin lataus epäonnistui.');
      } finally {
        setLoading(false);
      }
    };

    checkExistingProfile();
  }, [user, onProfileComplete]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!profile.termsAccepted) {
      setError('Käyttöehtojen hyväksyntä on pakollinen.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Hae laitetunniste
      const deviceFingerprint = await getCachedFingerprint();
      
      // Luo profiili (käytä käyttäjän ikää suoraan)
      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        age: user.age,
        deviceFingerprint: deviceFingerprint,
        termsAccepted: true,
        createdAt: new Date(),
        lastActive: new Date()
      };

      // Tallenna Firestoreen ja localStorage
      await setDoc(doc(db, 'profiles', user.uid), profileData);
      localStorage.setItem('chatnest-profile', JSON.stringify(profileData));
      
      onProfileComplete(profileData);
    } catch (error) {
      console.error('Virhe profiilin tallennuksessa:', error);
      setError('Profiilin tallennus epäonnistui. Yritä uudelleen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-setup-container">
        <div className="loading">Ladataan profiilia...</div>
      </div>
    );
  }

  return (
    <div className="profile-setup-container">
      <div className="profile-form">
        <h2>📝 Viimeistele profiilisi</h2>
        <p>Tervetuloa {user.displayName}, {user.age} vuotta! Hyväksy käyttöehdot aloittaaksesi chatit.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="user-preview">
            <div className="user-card">
              <div className="user-avatar">👤</div>
              <div className="user-info">
                <h3>{user.displayName}</h3>
                <p>{user.age} vuotta</p>
              </div>
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="termsAccepted"
                checked={profile.termsAccepted}
                onChange={handleInputChange}
                required
              />
              <span>Hyväksyn käyttöehdot ja sitoudun asialliseen käytökseen *</span>
            </label>
          </div>

          <div className="terms-summary">
            <h3>📋 Käyttöehdot lyhyesti:</h3>
            <ul>
              <li>🚫 Ei häirintää, kiusaamista tai sopimattomia viestejä</li>
              <li>🔐 Henkilötietoja ei jaeta muille käyttäjille</li>
              <li>⚠️ Väärinkäyttö johtaa pysyvään banniin</li>
              <li>📝 Viestit tallennetaan turvallisuussyistä</li>
            </ul>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="submit-btn"
          >
            {saving ? 'Tallennetaan...' : '🚀 Aloita chatit!'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;