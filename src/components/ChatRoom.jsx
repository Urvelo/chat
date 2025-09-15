import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ReportModal from './ReportModal';

const ChatRoom = ({ user, profile, roomId, roomData, onLeaveRoom }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Hae toisen käyttäjän tiedot
  const otherUser = roomData?.users?.find(u => u.uid !== user.uid);

  // Kuuntele viestejä reaaliajassa
  useEffect(() => {
    if (!roomId) return;

    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageList);
      setLoading(false);
    });

    return unsubscribe;
  }, [roomId]);

  // Vieritä automaattisesti uusimpiin viesteihin
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Lähetä viesti
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: profile.displayName,
        timestamp: serverTimestamp(),
        roomId: roomId
      };

      await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
      setNewMessage('');
      
      // Päivitä huoneen viimeinen aktiviteetti
      await updateDoc(doc(db, 'rooms', roomId), {
        lastActivity: serverTimestamp()
      });

    } catch (error) {
      console.error('Virhe viestin lähetyksessä:', error);
    }
  };

  // Käsittele kirjoittamisen merkkejä
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // Tässä voisi lähettää typing-merkin muille käyttäjille
    }

    // Nollaa timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Aseta uusi timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Poistu huoneesta
  const leaveRoom = async () => {
    try {
      // Päivitä huoneen tila
      await updateDoc(doc(db, 'rooms', roomId), {
        isActive: false,
        leftAt: serverTimestamp()
      });
      
      onLeaveRoom();
    } catch (error) {
      console.error('Virhe huoneesta poistumisessa:', error);
      onLeaveRoom(); // Poistu silti
    }
  };

  // Formatoi aika
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fi-FI', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="chat-room-container">
        <div className="loading">Ladataan chattia...</div>
      </div>
    );
  }

  return (
    <div className="chat-room-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-info">
          <h3>💬 Chatti {otherUser?.displayName || 'Tuntematon'} kanssa</h3>
          <p>🔒 Yksityinen keskustelu • Ikäryhmä: {roomData?.ageGroup}</p>
        </div>
        
        <div className="chat-controls">
          <button 
            onClick={() => setShowReportModal(true)}
            className="report-btn"
            title="Raportoi väärinkäyttö"
          >
            🚩
          </button>
          <button 
            onClick={leaveRoom}
            className="leave-btn"
            title="Poistu chatista"
          >
            🚪 Poistu
          </button>
        </div>
      </div>

      {/* Viestialue */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h4>🎉 Tervetuloa chattiin!</h4>
            <p>Aloita keskustelu kirjoittamalla viesti alle.</p>
            <div className="chat-tips">
              <p>💡 <strong>Muista:</strong></p>
              <ul>
                <li>🤝 Ole ystävällinen ja kunnioittava</li>
                <li>🚫 Älä jaa henkilötietoja</li>
                <li>🚩 Raportoi epäasiallinen käytös</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.senderId === user.uid ? 'own-message' : 'other-message'}`}
            >
              <div className="message-content">
                <div className="message-header">
                  <span className="sender-name">
                    {message.senderId === user.uid ? 'Sinä' : message.senderName}
                  </span>
                  <span className="message-time">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="message-text">
                  {message.text}
                </div>
              </div>
            </div>
          ))
        )}
        
        {otherUserTyping && (
          <div className="typing-indicator">
            <span>{otherUser?.displayName} kirjoittaa...</span>
            <div className="typing-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Viestin kirjoitusalue */}
      <div className="message-input-container">
        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Kirjoita viesti..."
            maxLength="500"
            className="message-input"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="send-btn"
          >
            📤
          </button>
        </form>
        
        <div className="input-info">
          <span>{newMessage.length}/500</span>
        </div>
      </div>

      {/* Raportointimodal */}
      {showReportModal && (
        <ReportModal
          roomId={roomId}
          reportedUser={otherUser}
          onClose={() => setShowReportModal(false)}
          onReportSent={leaveRoom}
        />
      )}
    </div>
  );
};

export default ChatRoom;