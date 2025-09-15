import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCachedFingerprint } from '../utils/fingerprint';

const ProfileSetup = ({ user, onProfileComplete }) => {
  const [profile, setProfile] = useState({
    displayName: '',
    birthYear: '',
    termsAccepted: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Laske ikäryhmä syntymävuodesta
  const calculateAgeGroup = (birthYear) => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(birthYear);
    
    if (age < 18) return 'under18';
    if (age <= 25) return '18-25';
    if (age <= 35) return '26-35';
    if (age <= 50) return '36-50';
    return '50+';
  };

  // Tarkista onko profiili jo olemassa
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setProfile(userData);
          onProfileComplete(userData);
        } else {
          // Aseta oletusarvot
          setProfile(prev => ({
            ...prev,
            displayName: user.displayName || ''
          }));
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
    
    // Validointi
    if (!profile.displayName.trim()) {
      setError('Nimi on pakollinen.');
      return;
    }
    
    if (!profile.birthYear || profile.birthYear < 1950 || profile.birthYear > 2010) {
      setError('Syötä kelvollinen syntymävuosi (1950-2010).');
      return;
    }
    
    if (!profile.termsAccepted) {
      setError('Käyttöehtojen hyväksyntä on pakollinen.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Hae laitetunniste
      const deviceFingerprint = await getCachedFingerprint();
      
      // Laske ikäryhmä
      const ageGroup = calculateAgeGroup(profile.birthYear);
      
      // Luo profiili
      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: profile.displayName.trim(),
        birthYear: parseInt(profile.birthYear),
        ageGroup: ageGroup,
        deviceFingerprint: deviceFingerprint,
        termsAccepted: true,
        createdAt: new Date(),
        lastActive: new Date()
      };

      // Tallenna Firestoreen
      await setDoc(doc(db, 'profiles', user.uid), profileData);
      
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
        <h2>📝 Luo profiilisi</h2>
        <p>Kerro hieman itsestäsi aloittaaksesi chatit!</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="displayName">Näytettävä nimi *</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={profile.displayName}
              onChange={handleInputChange}
              placeholder="Syötä nimesi..."
              maxLength="30"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="birthYear">Syntymävuosi *</label>
            <input
              type="number"
              id="birthYear"
              name="birthYear"
              value={profile.birthYear}
              onChange={handleInputChange}
              placeholder="esim. 1995"
              min="1950"
              max="2010"
              required
            />
            <small>Ikäryhmä määrittää kenen kanssa voit chatata</small>
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