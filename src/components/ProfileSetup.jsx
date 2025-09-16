import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, db } from '../firebase';
import { getCachedFingerprint } from '../utils/fingerprint';

const ProfileSetup = ({ user, onProfileComplete }) => {
  const [profile, setProfile] = useState({
    termsAccepted: false,
    backgroundMusic: true // Oletuksena päälle
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Tarkista onko profiili jo olemassa - POISTETTU localStorage
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        console.log("📋 Aina luodaan uusi profiili käyttäjälle:", user?.displayName);
        
        // EI tarkisteta localStorage:a tai Firestore:a - aina uusi profiili
        console.log("🆕 Uusi sessio - näytetään profiilisetup");
        
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
    
    console.log("📝 Profiilin luonti aloitettu...");
    
    if (!profile.termsAccepted) {
      setError('Käyttöehtojen hyväksyntä on pakollinen.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Hae laitetunniste
      const deviceFingerprint = await getCachedFingerprint();
      
      // Laske ikäryhmä käyttäjän iän perusteella
      const calculateAgeGroup = (age) => {
        if (age >= 15 && age <= 17) return '15-17';
        if (age >= 18 && age <= 25) return '18-25';
        return '25+';
      };
      
      // Tallenna musiikkiasetus localStorage:iin
      localStorage.setItem("playMusic", profile.backgroundMusic.toString());
      
      // Luo profiili
      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        age: user.age,
        ageGroup: calculateAgeGroup(user.age),
        deviceFingerprint: deviceFingerprint,
        termsAccepted: true,
        backgroundMusic: profile.backgroundMusic,
        createdAt: new Date(),
        lastActive: new Date()
      };

      console.log("💾 Tallennettava profiilidata:", profileData);

      // Tallenna vain Firestoreen - EI localStorage:iin
      await setDoc(doc(db, 'profiles', user.uid), profileData);
      
      console.log("✅ Profiili tallennettu, kutsutaan onProfileComplete");
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
        <h2>� Käyttöehdot</h2>


        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group checkbox-group large-checkbox">
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
            <h3>📋 Käyttöehdot ja säännöt:</h3>
            <div className="terms-content">
              <div className="terms-section">
                <h4>🛡️ Turvallisuus ja moderointi</h4>
                <ul>
                  <li>Käytämme automaattista moderointia epäasiallisen sisällön rajaamiseen</li>
                  <li>Sopimaton sisältö estetään</li>
                  <li>Asiallinen, tiedonhaun tai terveyskasvatuksen konteksti on sallittu</li>
                  <li>Häirintä ja uhkailu johtavat tilin estoon</li>
                </ul>
              </div>
              
              <div className="terms-section">
                <h4>🚫 Kiellettyä sisältöä</h4>
                <ul>
                  <li>Seksuaalinen häirintä tai sopimaton sisältö</li>
                  <li>Väkivalta, uhkailu tai kiusaaminen</li>
                  <li>Henkilötietojen jakaminen (osoite, puhelinnumero, yms.)</li>
                  <li>Huumeet, alkoholi tai muu laiton toiminta</li>
                  <li>Rasismi, syrjintä tai vihapuhe</li>
                </ul>
              </div>
              
              <div className="terms-section">
                <h4>✅ Sallittua ja toivottua</h4>
                <ul>
                  <li>Ystävällinen ja turvallinen keskustelu</li>
                  <li>Harrastuksista ja kiinnostuksista puhuminen</li>
                  <li>Asialliset kysymykset</li>
                  <li>Tuki ja neuvonanto vaikeissa tilanteissa</li>
                  <li>Huumori</li>
                </ul>
              </div>
              
              <div className="terms-section">
                <h4>🔐 Yksityisyys ja tietosuoja</h4>
                <ul>
                  <li>Emme tallenna keskusteluja palvelimelle. Huone poistetaan, kun poistut.</li>
                  <li>Profiilitiedot (kuten nimimerkki ja ikäryhmä) tarvitaan paritukseen</li>
                  <li>Henkilötietoja ei myydä tai jaeta ulkopuolisille</li>
                  <li>Voit lopettaa käytön milloin tahansa</li>
                </ul>
              </div>
              
              <div className="terms-section warning">
                <h4>⚠️ Seuraamukset</h4>
                <ul>
                  <li>Varoitus annetaan epäasiallisesta sisällöstä</li>
                  <li>Toistuvista ilmoituksista seuraa tilin esto</li>
                  <li>Vakavissa tapauksissa käyttö estetään välittömästi</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Musiikkivalinta */}
          <div className="music-preference">
            <h3>🎵 Taustamusiikki</h3>
            <label className="music-checkbox">
              <input
                type="checkbox"
                name="backgroundMusic"
                checked={profile.backgroundMusic}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              Soita rauhallista meditaatiomusiikkia taustalla
            </label>
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