import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { smartModerationService } from '../utils/smart-moderation.js';

const ChatRoom = ({ user, profile, roomId, roomData, onLeaveRoom }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomReady, setRoomReady] = useState(false);
  const [waitingForOther, setWaitingForOther] = useState(true);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Lähetä tiedosto/kuva
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !roomReady) return;

    // Tarkista tiedostokoko (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Tiedosto on liian suuri! Maksimikoko on 10MB.');
      return;
    }

    // Tarkista tiedostotyyppi
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const isImage = allowedTypes.includes(file.type);
    
    if (!isImage && !file.type.startsWith('image/')) {
      alert('Vain kuvat ovat tuettuja tällä hetkellä.');
      return;
    }

    setUploading(true);
    
    try {
      console.log("📁 Ladataan tiedosto:", file.name, file.size, "bytes");
      
      // Luo unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  const filePath = `chat-files/${roomId}/${fileName}`;
      
      // Upload tiedosto Firebase Storage:een
      const storageRef = ref(storage, filePath);
      const uploadResult = await uploadBytes(storageRef, file);
      
      console.log("✅ Tiedosto ladattu:", uploadResult.metadata.fullPath);
      
      // Hae download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log("🔗 Download URL:", downloadURL);
      
      // 🛡️ KUVAN MODERATION TARKISTUS
      if (isImage) {
        console.log("Moderoidaan kuva:", downloadURL);
        
        const moderationResult = await smartModerationService.moderateImage(downloadURL, user.uid);
        
        console.log("Kuvan moderation tulos:", moderationResult);
        
        // Jos kuva estetään
        if (moderationResult.isBlocked) {
          // Poista kuva Storage:sta
          await deleteObject(storageRef);
          alert(moderationResult.warningMessage || 'Kuva estetty moderaation vuoksi');
          return;
        }
        
        // Jos haitallista sisältöä, näytä varoitus
        if (moderationResult.isHarmful && moderationResult.warningMessage) {
          alert(moderationResult.warningMessage);
        }
      }
      
      // Lähetä viesti tiedostolla
      const messageData = {
        type: 'file',
        fileUrl: downloadURL,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isImage: isImage,
        storagePath: filePath,
        senderId: user.uid,
        senderName: profile.displayName,
        timestamp: serverTimestamp(),
        roomId: roomId
      };

      await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
      
      console.log("✅ Tiedostoviesti lähetetty!");
      
    } catch (error) {
      console.error('❌ Virhe tiedoston lähettämisessä:', error);
      alert('Tiedoston lähetys epäonnistui. Yritä uudelleen.');
    } finally {
      setUploading(false);
      // Tyhjennä file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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

  // Deaktivoi huone ja poistu - poista huone aina kokonaan
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
      
      // Poista kaikki viestit (ja niihin liittyvät tiedostot) ennen huoneen poistamista
      try {
        const msgsSnap = await getDocs(collection(db, 'rooms', roomId, 'messages'));
        for (const msgDoc of msgsSnap.docs) {
          const data = msgDoc.data();
          // Jos viesti sisälsi tiedoston, yritä poistaa myös Storage:sta
          if (data.type === 'file' && data.storagePath) {
            try {
              await deleteObject(ref(storage, data.storagePath));
              console.log('🧹 Poistettu tallennettu tiedosto:', data.storagePath);
            } catch (fileErr) {
              console.warn('⚠️ Tiedoston poisto epäonnistui (jatketaan):', fileErr?.message || fileErr);
            }
          }
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
            <div className="chat-avatar">
              {otherUser?.displayName?.charAt(0)?.toUpperCase() || '👤'}
            </div>
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
                <div className={`message ${isOwn ? 'own' : 'other'} ${message.type === 'file' ? 'file-message' : ''}`}>
                  <div className="message-content">
                    {message.type === 'file' ? (
                      <div className="file-content">
                        {message.isImage ? (
                          <div className="image-container">
                            <img 
                              src={message.fileUrl} 
                              alt={message.fileName}
                              className="message-image"
                              onLoad={(e) => {
                                // Scroll after image loads
                                setTimeout(() => {
                                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                            />
                            <div className="file-info">
                              <span className="file-name">{message.fileName}</span>
                              <span className="file-size">{(message.fileSize / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                        ) : (
                          <div className="file-download">
                            <div className="file-icon">📄</div>
                            <div className="file-details">
                              <div className="file-name">{message.fileName}</div>
                              <div className="file-size">{(message.fileSize / 1024).toFixed(1)} KB</div>
                            </div>
                            <a 
                              href={message.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="file-download-btn"
                            >
                              ⬇️
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      message.text
                    )}
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
          {/* File input (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          
          {/* File attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!roomReady || uploading}
            className="chat-file-btn"
            title="Lähetä kuva"
          >
            {uploading ? '⏳' : '📎'}
          </button>
          
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
    </div>
  );
};

export default ChatRoom;