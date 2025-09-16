import { useState } from 'react';

const FeedbackModal = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      alert('Kirjoita palaute ensin!');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://formspree.io/f/xqadvzwn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || 'anonymous@chat.fi',
          message: feedback,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setFeedback('');
        setEmail('');
        
        // Sulje modal 2 sekunnin kuluttua
        setTimeout(() => {
          onClose();
          setSubmitted(false);
        }, 2000);
      } else {
        throw new Error('Lähetys epäonnistui');
      }
    } catch (error) {
      console.error('Palautteen lähetys epäonnistui:', error);
      alert('Palautteen lähetys epäonnistui. Yritä uudelleen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-overlay">
      <div className="feedback-modal">
        <div className="feedback-header">
          <h3>💬 Anna palautetta</h3>
          <button onClick={onClose} className="close-btn">✖️</button>
        </div>
        
        {submitted ? (
          <div className="feedback-success">
            <div className="success-icon">✅</div>
            <p>Kiitos palautteestasi!</p>
            <p>Otamme kaiken palautteen huomioon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label>Sähköposti (valinnainen):</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jos haluat vastauksen..."
                className="feedback-input"
              />
            </div>

            <div className="form-group">
              <label>Palaute *:</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Kerro mielipiteesi, ehdotuksesi tai raportoi ongelmista..."
                className="feedback-textarea"
                rows={5}
                maxLength={1000}
                required
              />
              <div className="char-count">{feedback.length}/1000</div>
            </div>

            <div className="feedback-actions">
              <button type="button" onClick={onClose} className="cancel-btn">
                Peruuta
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || !feedback.trim()}
                className="submit-btn"
              >
                {isSubmitting ? 'Lähetetään...' : 'Lähetä palaute'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;