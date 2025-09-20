import { useState, useEffect } from 'react';
import { isUserBanned } from '../utils/ban-system.js';

const BannedPage = ({ user, onAppeal }) => {
  const [banInfo, setBanInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      try {
        if (user?.uid) {
          const banStatus = await isUserBanned(user.uid);
          setBanInfo(banStatus);
        }
      } catch (error) {
        console.error('❌ Virhe bannin tarkistuksessa:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBanStatus();
  }, [user?.uid]);

  const handleAppeal = () => {
    const subject = 'Valitus bannauksesta - chatti.online';
    const body = `Hei,

Haluaisin tehdä valituksen saamastani bannauksesta.

Käyttäjätunnus: ${user?.email || 'Ei tiedossa'}
Bannin syy: ${banInfo?.reason || 'Ei tiedossa'}
Bannin tyyppi: ${banInfo?.permanent ? 'Pysyvä' : 'Määräaikainen'}
${!banInfo?.permanent && banInfo?.endsAt ? `Päättyy: ${banInfo.endsAt.toLocaleString('fi-FI')}` : ''}

Perustelut valitukselle:
[Kirjoita tähän miksi uskot että banni on aiheeton]

Ystävällisin terveisin,
[Nimesi]`;

    window.location.href = `mailto:mailit@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="banned-page">
        <div className="banned-container">
          <div className="loading">Tarkistetaan tiliäsi...</div>
        </div>
      </div>
    );
  }

  if (!banInfo?.banned) {
    // Ei bannia, ohjaa takaisin
    return null;
  }

  return (
    <div className="banned-page">
      <div className="banned-container">
        <div className="banned-icon">🚫</div>
        
        <h1 className="banned-title">
          {banInfo.permanent ? 'Tilisi on estetty pysyvästi' : 'Tilisi on väliaikaisesti estetty'}
        </h1>
        
        <div className="banned-reason">
          <p><strong>Syy:</strong> {banInfo.reason || 'Käyttöehtojen rikkominen'}</p>
          
          {!banInfo.permanent && banInfo.endsAt && (
            <p><strong>Esto päättyy:</strong> {banInfo.endsAt.toLocaleString('fi-FI')}</p>
          )}
        </div>

        <div className="banned-info">
          <p>
            {banInfo.permanent 
              ? 'Tilisi on estetty pysyvästi toistuvien käyttöehtojen rikkomusten vuoksi.'
              : 'Tilisi on väliaikaisesti estetty käyttöehtojen rikkomuksen vuoksi.'
            }
          </p>
          
          <p>
            Jos uskot että esto on aiheeton, voit tehdä valituksen alla olevasta painikkeesta.
          </p>
        </div>

        <button 
          className="appeal-button"
          onClick={handleAppeal}
          title="Lähetä valitus sähköpostilla"
        >
          📧 Tee valitus
        </button>

        <div className="appeal-info">
          <small>
            Valitus lähetetään osoitteeseen mailit@gmail.com.<br/>
            Vastaamme valituksiin 1-3 arkipäivän kuluessa.
          </small>
        </div>
      </div>

      <style jsx>{`
        .banned-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .banned-container {
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid #333;
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .banned-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .banned-title {
          color: #ff4444;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 30px;
          line-height: 1.3;
        }

        .banned-reason {
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.3);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          text-align: left;
        }

        .banned-reason p {
          margin: 0 0 10px 0;
          font-size: 0.95rem;
        }

        .banned-reason p:last-child {
          margin-bottom: 0;
        }

        .banned-info {
          color: #ccc;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 30px;
        }

        .banned-info p {
          margin: 0 0 15px 0;
        }

        .banned-info p:last-child {
          margin-bottom: 0;
        }

        .appeal-button {
          background: linear-gradient(45deg, #4CAF50, #45a049);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 20px;
        }

        .appeal-button:hover {
          background: linear-gradient(45deg, #45a049, #3d8b40);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }

        .appeal-info {
          color: #888;
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .loading {
          color: #ccc;
          font-size: 1.1rem;
        }

        @media (max-width: 600px) {
          .banned-container {
            padding: 30px 20px;
          }
          
          .banned-title {
            font-size: 1.3rem;
          }
          
          .banned-icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default BannedPage;