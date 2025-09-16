import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { smartModerationService } from '../utils/smart-moderation.js';
import FeedbackModal from './FeedbackModal';

const ChatRoom = ({ user, profile, roomId, roomData, onLeaveRoom }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomReady, setRoomReady] = useState(false);
  const [waitingForOther, setWaitingForOther] = useState(true);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const messagesEndRef = useRef(null);

  // Hae toisen käyttäjän tiedot - varmista että roomData ja users on valideja
  const otherUser = roomData?.users?.find?.(u => u?.uid !== user?.uid);

  // Kuuntele huoneen valmiutta
  useEffect(() => {
    if (!roomId) return;

    console.log("Kuunnellaan huoneen valmiutta:", roomId);

    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Varmista että data on validia
        if (!data) {
          console.warn("⚠️ Huoneessa ei ole dataa");
          return;
        }
        
        const bothReady = data.bothReady || false;
        const users = data.users || [];
        
        // Varmista että users on array ja sisältää valideja objekteja
        if (!Array.isArray(users)) {
          console.warn("⚠️ Users ei ole array, korjataan:", users);
          // Jos users on objekti, yritä muuntaa arrayksi
          const usersArray = users && typeof users === 'object' ? Object.values(users) : [];
          data.users = usersArray.filter(u => u && typeof u === 'object' && u.uid);
        }
        
        // Tarkista onko molemmat merkinneet itsensä valmiiksi
        const validUsers = data.users.filter(u => u && u.uid);
        const readyCount = validUsers.filter(u => u.ready).length;
        const allReady = readyCount >= 2;
        
        console.log("Huoneen tila:", { bothReady, readyCount, allReady, usersCount: validUsers.length });
        
        if (allReady && !bothReady) {
          // Päivitä bothReady kun molemmat valmiita
          updateDoc(doc(db, 'rooms', roomId), { bothReady: true }).catch(console.error);
        }
        
        // Yksinkertainen: jos huone on olemassa ja meillä on data, chat on valmis
        const isReady = true; // Aina valmis jos huone löytyy
        setRoomReady(isReady);
        setWaitingForOther(false);
      } else {
        console.warn("⚠️ Huone ei enää ole olemassa:", roomId);
        // Huone on poistettu, palaa takaisin
        onLeaveRoom();
      }
    }, (error) => {
      console.error("❌ Virhe huoneen kuuntelussa:", error);
      // Jos kuuntelu epäonnistuu, palaa takaisin
      onLeaveRoom();
    });

    return unsubscribe;
  }, [roomId]);

  // Merkitse itsemme valmiiksi huoneessa - yksinkertaistettu
  useEffect(() => {
    const markSelfReady = async () => {
      if (!roomId || !user?.uid) return;
      
      try {
        console.log("🔄 Merkitään chat valmiiksi huoneessa:", roomId);
        
        // Varmista että olemme poissa waiting-listasta
        try {
          await deleteDoc(doc(db, 'waiting', user.uid));
          console.log("🗑️ Varmistettu poisto waiting-listasta");
        } catch (err) {
          console.log("ℹ️ Käyttäjä ei ollut waiting-listassa (ok)");
        }
        
        // Yksinkertainen: aseta chat suoraan valmiiksi
        await updateDoc(doc(db, 'rooms', roomId), {
          bothReady: true,
          readyAt: Date.now()
        });
        
        console.log("✅ Chat asetettu valmiiksi!");
        setRoomReady(true);
        setWaitingForOther(false);
        
      } catch (error) {
        console.error("❌ Virhe valmiuden merkitsemisessä:", error);
        // Fallback: aseta valmis pakolla
        setTimeout(() => {
          console.log("⏰ Fallback: chat pakolla valmiiksi");
          setRoomReady(true);
          setWaitingForOther(false);
        }, 3000);
      }
    };

    markSelfReady();
  }, [roomId, user?.uid]);

  // Kuuntele viestejä reaaliajassa - vain kun huone on valmis
  useEffect(() => {
    if (!roomId || !roomReady) {
      setLoading(false);
      return;
    }

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
  }, [roomId, roomReady]);

  // Automaattinen scroll uusimpiin viesteihin
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

    // Mobile keyboard handling - optimoitu versio
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    };

    // Optimoitu focus handling
    const handleInputFocus = (e) => {
      // Välitön scroll input-kentälle mobiilissa
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          e.target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 100);
      }
    };

    const handleInputBlur = () => {
      // Scroll takaisin viesteihin kun poistetaan focus
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
      }
    };

    // Event listenerit
    window.addEventListener('resize', handleResize);
    
    // Lisää focus/blur event listenerit input-kentälle
    const inputElement = document.querySelector('.chat-input');
    if (inputElement) {
      inputElement.addEventListener('focus', handleInputFocus);
      inputElement.addEventListener('blur', handleInputBlur);
    }

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      if (inputElement) {
        inputElement.removeEventListener('focus', handleInputFocus);
        inputElement.removeEventListener('blur', handleInputBlur);
      }
    };
  }, []);

  // Optimoitu input focus handler
  const handleInputFocus = () => {
    // Nopea reagointi mobiilissa
    if (window.innerWidth <= 768) {
      // Piilota header tilapäisesti lisätilaa varten
      const header = document.querySelector('.chat-header');
      if (header) {
        header.style.transform = 'translateY(-100%)';
        header.style.transition = 'transform 0.2s ease';
      }
      
      // Scroll bottom after keyboard shows
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  };

  const handleInputBlur = () => {
    // Palauta header
    if (window.innerWidth <= 768) {
      const header = document.querySelector('.chat-header');
      if (header) {
        header.style.transform = 'translateY(0)';
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !roomReady) {
      console.log("Ei voida lähettää viestiä:", { hasMessage: !!newMessage.trim(), roomReady });
      return;
    }

    try {
      console.log("Moderoidaan viesti:", newMessage.trim());
      
      // 🛡️ MODERATION TARKISTUS
      const moderationResult = await smartModerationService.moderateMessage(newMessage.trim(), user.uid);
      
      console.log("Moderation tulos:", moderationResult);
      
      // Jos viesti estetään
      if (moderationResult.isBlocked) {
        alert(moderationResult.warningMessage || 'Viesti estetty moderaation vuoksi');
        setNewMessage(''); // Tyhjennä kenttä
        return;
      }
      
      // Jos haitallista sisältöä mutta ei estetä, näytä varoitus
      if (moderationResult.isHarmful && moderationResult.warningMessage) {
        alert(moderationResult.warningMessage);
        // Jatka viestin lähettämistä varoituksen jälkeen
      }
      
      // Lähetä viesti
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
      
      // Jos moderation epäonnistui, salli viesti turvallisuussyistä
      if (error.message?.includes('moderation')) {
        console.warn('Moderation epäonnistui, lähetetään viesti silti');
        
        const messageData = {
          text: newMessage.trim(),
          senderId: user.uid,
          senderName: profile.displayName,
          timestamp: serverTimestamp(),
          roomId: roomId
        };

        await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
        setNewMessage('');
      }
    }
  };

  // Ilmoita käyttäjä (porrastettu bänni: 3 ilmoitusta = temp bänni, 3 temp bänniä = ikuinen)
  const reportUser = async () => {
    try {
      if (!otherUser?.uid) {
        console.warn("Ei voida ilmoittaa: toista käyttäjää ei löydy");
        return;
      }

      console.log("📋 Ilmoitetaan käyttäjä:", otherUser.uid);
      
      // Hae nykyinen profiili
      const profileRef = doc(db, 'profiles', otherUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        console.warn("Käyttäjän profiilia ei löydy, ei voida ilmoittaa");
        return;
      }
      
      const currentProfile = profileSnap.data();
      const currentReports = currentProfile.reports || 0;
      const banHistory = currentProfile.banHistory || [];
      const newReportCount = currentReports + 1;
      
      let updateData = {
        reports: newReportCount,
        lastReported: new Date()
      };
      
      let alertMessage = '';
      let shouldLeave = false;
      
      // Tarkista onko jo ikuisesti bannattu
      if (currentProfile.banned) {
        alert('Käyttäjä on jo bannattu ikuisesti.');
        return;
      }
      
      // Jos 3+ ilmoitusta, anna bänni
      if (newReportCount >= 3) {
        const tempBanCount = banHistory.filter(ban => ban.type === 'temporary').length;
        
        if (tempBanCount >= 2) {
          // Kolmas temp-bänni = ikuinen bänni
          updateData.banned = true;
          updateData.bannedAt = new Date();
          updateData.bannedReason = `Ikuinen bänni: ${tempBanCount + 1} väliaikaista bänniä`;
          updateData.banHistory = [...banHistory, {
            type: 'permanent',
            reason: `${newReportCount} ilmoitusta (kolmas temp-bänni)`,
            createdAt: new Date(),
            reportCount: newReportCount
          }];
          
          alertMessage = `Käyttäjä on bannattu ikuisesti (${tempBanCount + 1}. väliaikainen bänni). Kiitos ilmoituksesta!`;
          shouldLeave = true;
        } else {
          // Ensimmäinen tai toinen temp-bänni (24h)
          const tempBanEnd = new Date();
          tempBanEnd.setHours(tempBanEnd.getHours() + 24);
          
          updateData.temporaryBan = {
            active: true,
            bannedAt: new Date(),
            bannedUntil: tempBanEnd,
            reason: `${newReportCount} ilmoitusta`
          };
          updateData.banHistory = [...banHistory, {
            type: 'temporary',
            reason: `${newReportCount} ilmoitusta`,
            createdAt: new Date(),
            expiresAt: tempBanEnd,
            reportCount: newReportCount
          }];
          updateData.reports = 0; // Nollaa ilmoitukset temp-bännin jälkeen
          
          alertMessage = `Käyttäjä on bannattu 24 tunniksi (${tempBanCount + 1}. väliaikainen bänni). Kiitos ilmoituksesta!`;
          shouldLeave = true;
        }
      } else {
        alertMessage = `Käyttäjä ilmoitettu (${newReportCount}/3). Kiitos ilmoituksesta!`;
      }
      
      // Päivitä profiili
      await updateDoc(profileRef, updateData);
      console.log(`✅ Käyttäjä ilmoitettu (${newReportCount}/3 ilmoitusta)`);
      
      alert(alertMessage);
      
      if (shouldLeave) {
        // Poistu huoneesta automaattisesti
        leaveRoom();
      } else {
        setShowReportMenu(false);
      }
      
    } catch (error) {
      console.error('❌ Virhe käyttäjän ilmoittamisessa:', error);
      alert('Ilmoitus epäonnistui. Yritä uudelleen.');
    }
  };
  const leaveRoom = async () => {
    try {
      console.log("🗑️ Poistetaan chat-huone kokonaan:", roomId);
      
      // Jos huone ei ole vielä valmis, palauta toinen käyttäjä waiting-listaan
      if (!roomReady && otherUser) {
        const waitingData = {
          id: otherUser.uid,
          name: otherUser.displayName,
          ageGroup: roomData.ageGroup,
          timestamp: Date.now()
        };
        
        try {
          await setDoc(doc(db, 'waiting', otherUser.uid), waitingData);
          console.log("↩️ Toinen käyttäjä palautettu waiting-listaan");
        } catch (error) {
          console.error("❌ Virhe toisen käyttäjän palauttamisessa:", error);
        }
      }
      
      // Jos huone on valmis ja toinen käyttäjä on yhä paikalla, lähetä "chat päättynyt" -viesti
      if (roomReady && otherUser && roomData.users?.includes(otherUser.uid)) {
        try {
          const leaveMessage = {
            id: 'leave_' + Date.now(),
            senderId: 'system',
            senderName: 'Järjestelmä',
            text: `${user.displayName} poistui chatista. Chat on päättynyt. Voit nyt etsiä uuden keskustelukumppanin.`,
            timestamp: serverTimestamp(),
            type: 'system'
          };
          
          await setDoc(doc(db, 'rooms', roomId, 'messages', leaveMessage.id), leaveMessage);
          console.log("📤 Lähetettiin 'chat päättynyt' -viesti toiselle käyttäjälle");
          
          // Odota hetki että viesti ehtii perille
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("❌ Virhe päättymis-viestin lähettämisessä:", error);
        }
      }
      
      // Poista kaikki viestit ennen huoneen poistamista
      try {
        const msgsSnap = await getDocs(collection(db, 'rooms', roomId, 'messages'));
        for (const msgDoc of msgsSnap.docs) {
          try {
            await deleteDoc(doc(db, 'rooms', roomId, 'messages', msgDoc.id));
          } catch (msgErr) {
            console.warn('⚠️ Viestin poisto epäonnistui (jatketaan):', msgErr?.message || msgErr);
          }
        }
        console.log('🧹 Viestit siivottu');
      } catch (msgsErr) {
        console.warn('⚠️ Viestien siivous epäonnistui (jatketaan):', msgsErr?.message || msgsErr);
      }

      // Poista huone kokonaan - ei säilytetä historiaa
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
        console.log("✅ Huone poistettu kokonaan");
      } catch (error) {
        console.error("❌ Virhe huoneen poistamisessa:", error);
        // Varmista että merkitään epäaktiiviseksi jos poisto epäonnistui
        try {
          await updateDoc(doc(db, 'rooms', roomId), {
            isActive: false,
            leftAt: serverTimestamp()
          });
          console.log("⚠️ Huone merkitty epäaktiiviseksi");
        } catch (fallbackError) {
          console.error("❌ Myös fallback epäonnistui:", fallbackError);
        }
      }
      
    } catch (error) {
      console.error('❌ Virhe huoneen käsittelyssä:', error);
    } finally {
      // Poistu huoneesta aina
      console.log("🚪 Poistutaan huoneesta");
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

  if (waitingForOther) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-user-info">
              <h3>{otherUser?.displayName || 'Tuntematon'}</h3>
              <p>Yhdistämässä...</p>
            </div>
          </div>
          <div className="chat-actions">
            <button onClick={leaveRoom} className="leave-btn">
              ✖️
            </button>
          </div>
        </div>
        <div className="chat-messages">
          <div className="waiting-for-other">
            <div className="waiting-icon">⏳</div>
            <h3>Odotetaan toista käyttäjää...</h3>
            <p>Chat alkaa kun molemmat ovat valmiita!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* WhatsApp/Snapchat-tyylinen header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-user-info">
            <h3>{otherUser?.displayName || 'Tuntematon'}</h3>
            <p>online nyt</p>
          </div>
        </div>
        <div className="chat-actions">
          {/* Kebab menu */}
          <div className="kebab-menu">
            <button 
              onClick={() => setShowReportMenu(!showReportMenu)}
              className="kebab-btn"
              title="Lisää toiminnot"
            >
              ⋮
            </button>
            {showReportMenu && (
              <div className="kebab-dropdown">
                <button onClick={reportUser} className="report-btn">
                  🚨 Ilmoita käyttäjä
                </button>
                <button 
                  onClick={() => {
                    setShowFeedbackModal(true);
                    setShowReportMenu(false);
                  }} 
                  className="feedback-btn"
                >
                  💬 Anna palautetta
                </button>
              </div>
            )}
          </div>
          
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
            if (!message || !message.text) return null;
            
            // System-viestit erityiskäsittely
            if (message.type === 'system') {
              return (
                <div key={message.id} className="message-wrapper system">
                  <div className="message system">
                    <div className="message-content">
                      {message.text}
                    </div>
                    <div className="message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              );
            }
            
            // Normaalit käyttäjäviestit
            const isOwn = message.senderId === user.uid;
            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.senderId !== message.senderId);
            
            return (
              <div
                key={message.id}
                className={`message-wrapper ${isOwn ? 'own' : 'other'}`}
              >
                <div className={`message ${isOwn ? 'own' : 'other'}`}>
                  <div className="message-content">
                    {message.text}
                  </div>
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
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onInput={(e) => {
              // Auto-resize up to ~150px height
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 150) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Trigger send on Enter (Shift+Enter = newline)
                sendMessage({ preventDefault: () => {} });
              }
            }}
            placeholder={roomReady ? "Kirjoita viesti..." : "Odotetaan toista käyttäjää..."}
            className="chat-input"
            rows={1}
            maxLength={500}
            autoComplete="off"
            disabled={!roomReady}
            inputMode="text"
            enterKeyHint="send"
            style={{ resize: 'none' }}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || !roomReady}
            className="chat-send-btn"
          >
            <span className="send-arrow">➤</span>
          </button>
        </form>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </div>
  );
};

export default ChatRoom;