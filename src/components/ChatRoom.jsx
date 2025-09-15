import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, db } from '../firebase';

const ChatRoom = ({ user, profile, roomId, roomData, onLeaveRoom }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Hae toisen käyttäjän tiedot
  const otherUser = roomData?.users?.find(u => u.uid !== user.uid);

  // Kuuntele viestejä reaaliajassa
  useEffect(() => {
    if (!roomId) return;

    console.log("Aloitetaan viestien kuuntelu huoneelle:", roomId);

    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Viestejä löytyi:", snapshot.size);
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageList);
      setLoading(false);
    }, (error) => {
      console.error("Virhe viestien kuuntelussa:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [roomId]);

  // Automaattinen scroll uusimpiin viesteihin
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Lähetä viesti
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      console.log("Lähetetään viesti:", newMessage.trim());
      
      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: profile.displayName,
        timestamp: serverTimestamp(),
        roomId: roomId
      };

      await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
      setNewMessage('');
      
      console.log("Viesti lähetetty onnistuneesti");

    } catch (error) {
      console.error('Virhe viestin lähetyksessä:', error);
    }
  };

  // Deaktivoi huone ja poistu
  const leaveRoom = async () => {
    try {
      // Merkitse huone epäaktiiviseksi
      await updateDoc(doc(db, 'rooms', roomId), {
        isActive: false,
        leftAt: serverTimestamp()
      });
      
      console.log("Huone deaktivoitu");
    } catch (error) {
      console.error('Virhe huoneen deaktivoinnissa:', error);
    } finally {
      // Poistu huoneesta aina
      onLeaveRoom();
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
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">👤</div>
            <div className="chat-user-info">
              <h3>Ladataan...</h3>
            </div>
          </div>
        </div>
        <div className="chat-messages">
          <div className="loading-messages">Ladataan chattia...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* WhatsApp/Snapchat-tyylinen header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">
            {otherUser?.displayName?.charAt(0)?.toUpperCase() || '👤'}
          </div>
          <div className="chat-user-info">
            <h3>{otherUser?.displayName || 'Tuntematon'}</h3>
            <p>online nyt</p>
          </div>
        </div>
        <div className="chat-actions">
          <button onClick={leaveRoom} className="leave-btn">
            ✖️
          </button>
        </div>
      </div>

      {/* Viestialue */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <p>Aloita keskustelu tervehtimällä!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === user.uid;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.senderId !== message.senderId);
            
            return (
              <div
                key={message.id}
                className={`message-wrapper ${isOwn ? 'own' : 'other'}`}
              >
                {showAvatar && !isOwn && (
                  <div className="message-avatar">
                    {message.senderName?.charAt(0)?.toUpperCase() || '👤'}
                  </div>
                )}
                <div className={`message ${isOwn ? 'own' : 'other'}`}>
                  <div className="message-content">{message.text}</div>
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Snapchat/WhatsApp-tyylinen input */}
      <div className="chat-input-container">
        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Kirjoita viesti..."
            className="chat-input"
            maxLength={500}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="chat-send-btn"
          >
            <span className="send-arrow">➤</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;