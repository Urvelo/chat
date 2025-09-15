import { useState } from 'react';
import { collection, addDoc, serverTimestamp, db } from '../firebase';

const ReportModal = ({ roomId, reportedUser, onClose, onReportSent }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const reportReasons = [
    { value: 'harassment', label: '🚫 Häirintä tai kiusaaminen' },
    { value: 'inappropriate', label: '🔞 Sopimaton sisältö' },
    { value: 'spam', label: '📧 Roskaposti tai mainonta' },
    { value: 'personal_info', label: '🔐 Henkilötietojen kysely/jako' },
    { value: 'hate_speech', label: '💔 Vihapuhe tai syrjintä' },
    { value: 'threats', label: '⚠️ Uhkailu tai väkivalta' },
    { value: 'other', label: '❓ Muu syy' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) return;
    
    setSending(true);
    
    try {
      const reportData = {
        roomId: roomId,
        reportedUserId: reportedUser?.uid,
        reportedUserName: reportedUser?.displayName,
        reason: reason,
        customReason: reason === 'other' ? customReason.trim() : '',
        timestamp: serverTimestamp(),
        status: 'pending' // pending, reviewed, resolved
      };

      await addDoc(collection(db, 'reports'), reportData);
      
      setSuccess(true);
      
      // Sulje modal 2 sekunnin kuluttua
      setTimeout(() => {
        onReportSent?.();
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Virhe raportin lähetyksessä:', error);
      alert('Raportin lähettäminen epäonnistui. Yritä uudelleen.');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="modal-content report-modal">
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h3>Raportti lähetetty!</h3>
            <p>Kiitos raportista. Tutkimme asian mahdollisimman pian.</p>
            <p>Poistutaan chatista...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content report-modal">
        <div className="modal-header">
          <h3>🚩 Raportoi väärinkäyttö</h3>
          <button onClick={onClose} className="close-btn">✖️</button>
        </div>

        <div className="modal-body">
          <div className="report-info">
            <p>Raportoit käyttäjää: <strong>{reportedUser?.displayName || 'Tuntematon'}</strong></p>
            <p>Huone ID: <code>{roomId}</code></p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Miksi raportoit tämän käyttäjän? *</label>
              <div className="reason-options">
                {reportReasons.map((option) => (
                  <label key={option.value} className="reason-option">
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {reason === 'other' && (
              <div className="form-group">
                <label htmlFor="customReason">Kuvaile tarkemmin:</label>
                <textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Kerro tarkemmin mikä oli ongelma..."
                  maxLength="300"
                  rows="3"
                  required
                />
                <small>{customReason.length}/300 merkkiä</small>
              </div>
            )}

            <div className="important-notice">
              <h4>⚠️ Tärkeää:</h4>
              <ul>
                <li>📝 Kaikki raportit tutkitaan huolellisesti</li>
                <li>🚫 Väärinkäyttäjät bannataan pysyvästi</li>
                <li>🔐 Raporttisi käsitellään luottamuksellisesti</li>
                <li>⚡ Akuutissa vaarassa? Ota yhteyttä viranomaisiin</li>
              </ul>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={onClose}
                className="cancel-btn"
                disabled={sending}
              >
                Peruuta
              </button>
              <button 
                type="submit"
                disabled={!reason || sending}
                className="submit-btn"
              >
                {sending ? 'Lähetetään...' : '📤 Lähetä raportti'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;