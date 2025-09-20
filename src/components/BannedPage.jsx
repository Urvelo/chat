import { useState, useEffect } from 'react';
import { isUserBanned } from '../utils/ban-system.js';

const BannedPage = ({ user, onAppeal }) => {
  const [banInfo, setBanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleAppeal = async () => {
    if (!appealText.trim()) {
      alert('Kirjoita perustelut valituksellesi');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('user_email', user?.email || 'Ei sähköpostia');
      formData.append('user_id', user?.uid || 'Ei ID:tä');
      formData.append('ban_reason', banInfo?.reason || 'Ei syytä');
      formData.append('ban_type', banInfo?.permanent ? 'Pysyvä' : 'Määräaikainen');
      formData.append('ban_ends', !banInfo?.permanent && banInfo?.endsAt ? banInfo.endsAt.toLocaleString('fi-FI') : 'Ei päättymisaikaa');
      formData.append('appeal_text', appealText);

      const response = await fetch('https://formspree.io/f/mwpngaaz', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        alert('Valitus lähetetty onnistuneesti! Vastaamme 1-3 arkipäivän kuluessa.');
        setShowAppealForm(false);
        setAppealText('');
      } else {
        throw new Error('Lähetys epäonnistui');
      }
    } catch (error) {
      console.error('Valituksen lähetys epäonnistui:', error);
      alert('Valituksen lähetys epäonnistui. Yritä uudelleen.');
    } finally {
      setSubmitting(false);
    }
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
            Jos uskot että esto on aiheeton, voit{' '}
            <span 
              className="appeal-link"
              onClick={() => setShowAppealForm(!showAppealForm)}
            >
              tehdä valituksen
            </span>.
          </p>
        </div>

        {showAppealForm && (
          <div className="appeal-form">
            <textarea
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              placeholder="Kerro miksi uskot että banni on aiheeton..."
              className="appeal-textarea"
              rows={4}
              maxLength={500}
            />
            <div className="appeal-buttons">
              <button 
                onClick={handleAppeal}
                disabled={submitting || !appealText.trim()}
                className="submit-appeal"
              >
                {submitting ? 'Lähetetään...' : 'Lähetä valitus'}
              </button>
              <button 
                onClick={() => setShowAppealForm(false)}
                className="cancel-appeal"
              >
                Peruuta
              </button>
            </div>
          </div>
        )}

        {!showAppealForm && (
          <div className="appeal-info">
            <small>
              Vastaamme valituksiin 1-3 arkipäivän kuluessa.
            </small>
          </div>
        )}
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

        .appeal-link {
          color: #4CAF50;
          text-decoration: underline;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .appeal-link:hover {
          color: #45a049;
        }

        .appeal-form {
          background: rgba(40, 40, 40, 0.8);
          border: 1px solid #555;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .appeal-textarea {
          width: 100%;
          background: rgba(60, 60, 60, 0.8);
          border: 1px solid #666;
          border-radius: 6px;
          color: white;
          padding: 12px;
          font-size: 0.9rem;
          resize: vertical;
          font-family: inherit;
          margin-bottom: 15px;
        }

        .appeal-textarea::placeholder {
          color: #aaa;
        }

        .appeal-textarea:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .appeal-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .submit-appeal {
          background: linear-gradient(45deg, #4CAF50, #45a049);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .submit-appeal:hover:not(:disabled) {
          background: linear-gradient(45deg, #45a049, #3d8b40);
          transform: translateY(-1px);
        }

        .submit-appeal:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-appeal {
          background: rgba(100, 100, 100, 0.3);
          color: #ccc;
          border: 1px solid #666;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-appeal:hover {
          background: rgba(120, 120, 120, 0.4);
          color: white;
        }

        .appeal-info {
          color: #666;
          font-size: 0.75rem;
          line-height: 1.3;
          margin-top: 15px;
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

          .appeal-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default BannedPage;