import { useState } from 'react';

const Welcome = ({ onContinue }) => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <div className="welcome-container">
      <div className="welcome-box">
        <h1>💬 Tervetuloa Chatti.onlineen!</h1>
        
        <div className="welcome-content">
          <div className="welcome-section">
            <h3>🎯 Turvallinen chat nuorille</h3>
            <p></p>
            <p>Jos näet käyttäjän rikkovan sääntöjä, ilmoita heti käyttäjästä.</p>
          </div>

          <div className="welcome-section warning">
            <h3>⚠️ Tärkeää!</h3>
            <p><strong>Muista valita oikea ikäsi ennen chatin aloittamista.</strong></p>
            <p>Valehtelu iästä voi johtaa bänniin.</p>
          </div>

          <div className="welcome-section">
            <h3>💬 Palautetta tervetullut!</h3>
            <p>Haluamme kuulla palautetta chatista – se auttaa meitä pitämään palvelun turvallisena ja mukavana kaikille.</p>
          </div>

          <div className="welcome-actions">
            <button 
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              className="disclaimer-btn"
            >
              {showDisclaimer ? '📄 Piilota vastuuvapauslauseke' : '📄 Näytä vastuuvapauslauseke'}
            </button>
            
            {showDisclaimer && (
              <div className="disclaimer-content">
                <h4>📋 Vastuuvapauslauseke</h4>
                <div className="disclaimer-text">
                  <p><strong>Chatti.online</strong> on vapaaehtoinen chat-palvelu. Käyttämällä palvelua hyväksyt seuraavat ehdot:</p>
                  
                  <ul>
                    <li>Palvelu tarjotaan "sellaisenaan" ilman takuita</li>
                    <li>Emme vastaa käyttäjien välisistä keskusteluista tai niiden sisällöstä</li>
                    <li>Käyttäjät ovat vastuussa omasta toiminnastaan palvelussa</li>
                    <li>Pidätämme oikeuden estää käyttäjien pääsy palveluun ilman ennakkoilmoitusta</li>
                    <li>Emme tallenna keskusteluja - kaikki viestit poistetaan huoneen sulkeutuessa</li>
                    <li>Moderoimme sisältöä automaattisesti, mutta emme takaa 100% suodatusta</li>
                    <li>Ilmoita heti epäasiallisesta käytöksestä käyttämällä ilmoitustoimintoa</li>
                  </ul>
                  
                  <p><strong>Käyttämällä palvelua vakuutat olevasi vähintään 15-vuotias ja hyväksyt nämä ehdot.</strong></p>
                </div>
              </div>
            )}
            
            <button 
              onClick={onContinue}
              className="continue-btn"
            >
              🚀 Jatka chattiin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;