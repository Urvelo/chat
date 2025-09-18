import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, db } from '../firebase';
import { getCachedFingerprint } from '../utils/fingerprint';

const ProfileSetup = ({ user, onProfileComplete }) => {
  const [profile, setProfile] = useState({
    termsAccepted: false,
    backgroundMusic: true, // Oletuksena päälle
    age: user?.age || '' // Google-käyttäjien ikä saattaa puuttua
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

    // Tarkista ikä Google-käyttäjillä
    if (!profile.age || profile.age < 15) {
      setError('Ikä täytyy olla vähintään 15 vuotta.');
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
      
      // Luo profiili
      const finalProfile = {
        displayName: user.displayName,
        age: parseInt(profile.age), // Käytä lomakkeesta syötettyä ikää
        ageGroup: profile.age >= 18 ? '18+' : '15-17',
        backgroundMusic: profile.backgroundMusic,
        deviceFingerprint,
        createdAt: new Date().toISOString(),
        isGoogleUser: user.isGoogleUser || false
      };      console.log("💾 Tallennettava profiilidata:", profileData);

      // Tallenna vain Firestoreen - EI localStorage:iin
      await setDoc(doc(db, 'profiles', user.uid), profileData);
      
      // Tallenna musiikki-asetus localStorage:iin
      localStorage.setItem("playMusic", profile.backgroundMusic.toString());
      
      // Lähetä custom event jotta ChatRoom kuulee muutoksen
      window.dispatchEvent(new Event('musicSettingChanged'));
      
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
      <div className="welcome-container">
        <div className="welcome-box">
          <div className="loading">Ladataan profiilia...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-container">
      <div className="welcome-box">
        <h1>📋 Käyttöehdot ja säännöt</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="welcome-content">
            <div className="welcome-section">
              <h3>🛡️ Turvallisuus ja moderointi:</h3>
              <ul>
                <li>Käytämme automaattista moderointia epäasiallisen sisällön rajaamiseen</li>
                <li>Sopimaton sisältö estetään</li>
                <li>Asiallinen, tiedonhaun tai terveyskasvatuksen konteksti on sallittu</li>
                <li>Häirintä ja uhkailu johtavat tilin estoon</li>
              </ul>
            </div>
            
            <div className="welcome-section">
              <h3>🚫 Kiellettyä sisältöä:</h3>
              <ul>
                <li>Seksuaalinen häirintä tai sopimaton sisältö</li>
                <li>Väkivalta, uhkailu tai kiusaaminen</li>
                <li>Henkilötietojen jakaminen (osoite, puhelinnumero, yms.)</li>
                <li>Huumeet, alkoholi tai muu laiton toiminta</li>
                <li>Rasismi, syrjintä tai vihapuhe</li>
              </ul>
            </div>
            
            <div className="welcome-section">
              <h3>✅ Sallittua ja toivottua:</h3>
              <ul>
                <li>Ystävällinen ja turvallinen keskustelu</li>
                <li>Harrastuksista ja kiinnostuksista puhuminen</li>
                <li>Asialliset kysymykset</li>
                <li>Tuki ja neuvonanto vaikeissa tilanteissa</li>
                <li>Huumori</li>
              </ul>
            </div>
            
            <div className="welcome-section">
              <h3>🔐 Yksityisyys ja tietosuoja:</h3>
              <ul>
                <li>Emme tallenna keskusteluja palvelimelle. Huone poistetaan, kun poistut.</li>
                <li>Profiilitiedot (kuten nimimerkki ja ikäryhmä) tarvitaan paritukseen</li>
                <li>Henkilötietoja ei myydä tai jaeta ulkopuolisille</li>
                <li>Voit lopettaa käytön milloin tahansa</li>
              </ul>
            </div>
            
            <div className="welcome-section warning">
              <h3>⚠️ Seuraamukset:</h3>
              <ul>
                <li>Varoitus annetaan epäasiallisesta sisällöstä</li>
                <li>Toistuvista ilmoituksista seuraa tilin esto</li>
                <li>Vakavissa tapauksissa käyttö estetään välittömästi</li>
              </ul>
            </div>
          </div>

          <div className="welcome-actions">
            {/* Google-käyttäjien ikä-kenttä */}
            {(!user.age || user.isGoogleUser) && (
              <div className="form-group">
                <label htmlFor="age">Ikäsi *</label>
                <input
                  id="age"
                  type="number"
                  name="age"
                  value={profile.age}
                  onChange={handleInputChange}
                  placeholder="Kirjoita ikäsi..."
                  min="15"
                  max="99"
                  required
                />
                <small>Ikäsi tarvitaan sopivien chatti-kavereiden löytämiseen.</small>
              </div>
            )}

            {/* Käyttöehtojen hyväksyminen */}
            <div className="terms-preference">
              <label className="music-checkbox-simple">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={profile.termsAccepted}
                  onChange={handleInputChange}
                  required
                />
                <span className="checkmark"></span>
                Hyväksyn käyttöehdot
              </label>
            </div>

            {/* Musiikkivalinta */}
            <div className="music-preference">
              <label className="music-checkbox-simple">
                <input
                  type="checkbox"
                  name="backgroundMusic"
                  checked={profile.backgroundMusic}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Haluatko taustamusiikkia?
              </label>
            </div>

            <button 
              type="submit" 
              disabled={saving || !profile.termsAccepted}
              className="continue-btn"
            >
              {saving ? 'Tallennetaan...' : '🚀 Aloita chatit!'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;