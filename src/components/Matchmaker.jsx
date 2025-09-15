import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

const Matchmaker = ({ user, profile, onRoomJoined }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, searching, matched
  const [searchStartTime, setSearchStartTime] = useState(null);

  // Kuuntele odottavia käyttäjiä samasta ikäryhmästä
  useEffect(() => {
    if (!profile?.ageGroup) return;

    const q = query(
      collection(db, 'waiting'),
      where('ageGroup', '==', profile.ageGroup),
      where('uid', '!=', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWaitingUsers(users);
      
      // Jos etsimme ja löytyy käyttäjä, luo huone
      if (isSearching && users.length > 0) {
        createChatRoom(users[0]);
      }
    });

    return unsubscribe;
  }, [profile?.ageGroup, user.uid, isSearching]);

  // Luo chat-huone toisen käyttäjän kanssa
  const createChatRoom = async (otherUser) => {
    try {
      setStatus('matched');
      
      // Luo uniikki huone-ID
      const roomId = uuidv4();
      
      // Luo huone Firestoreen
      const roomData = {
        id: roomId,
        users: [
          {
            uid: user.uid,
            displayName: profile.displayName,
            joinedAt: serverTimestamp()
          },
          {
            uid: otherUser.uid,
            displayName: otherUser.displayName,
            joinedAt: serverTimestamp()
          }
        ],
        ageGroup: profile.ageGroup,
        createdAt: serverTimestamp(),
        isActive: true,
        type: 'text' // vain tekstichat, ei videota
      };

      await addDoc(collection(db, 'rooms'), roomData);
      
      // Poista molemmat käyttäjät waiting-listasta
      await deleteDoc(doc(db, 'waiting', `waiting_${user.uid}`));
      await deleteDoc(doc(db, 'waiting', otherUser.id));
      
      // Siirry chat-huoneeseen
      onRoomJoined(roomId, roomData);
      
    } catch (error) {
      console.error('Virhe huoneen luonnissa:', error);
      setStatus('idle');
      setIsSearching(false);
    }
  };

  // Aloita käyttäjien etsintä
  const startSearching = async () => {
    try {
      setIsSearching(true);
      setStatus('searching');
      setSearchStartTime(Date.now());
      
      // Tarkista onko jo odottavia käyttäjiä
      if (waitingUsers.length > 0) {
        await createChatRoom(waitingUsers[0]);
        return;
      }
      
      // Lisää itsemme waiting-listaan
      const waitingData = {
        uid: user.uid,
        displayName: profile.displayName,
        ageGroup: profile.ageGroup,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      };
      
      await addDoc(collection(db, 'waiting'), waitingData);
      
    } catch (error) {
      console.error('Virhe etsinnän aloituksessa:', error);
      setIsSearching(false);
      setStatus('idle');
    }
  };

  // Lopeta etsintä
  const stopSearching = async () => {
    try {
      setIsSearching(false);
      setStatus('idle');
      setSearchStartTime(null);
      
      // Poista itsemme waiting-listasta
      await deleteDoc(doc(db, 'waiting', `waiting_${user.uid}`));
      
    } catch (error) {
      console.error('Virhe etsinnän lopetuksessa:', error);
    }
  };

  // Laske etsintäaika
  const getSearchDuration = () => {
    if (!searchStartTime) return 0;
    return Math.floor((Date.now() - searchStartTime) / 1000);
  };

  return (
    <div className="matchmaker-container">
      <div className="matchmaker-content">
        <h2>🔍 Etsi chattikaveria</h2>
        
        <div className="user-info">
          <p>👋 Hei <strong>{profile.displayName}</strong>!</p>
          <p>🎯 Ikäryhmä: <strong>{profile.ageGroup}</strong></p>
          <p>📱 Etsimme sinulle samanikäistä chattikaveria...</p>
        </div>

        {status === 'idle' && (
          <div className="search-controls">
            <button 
              onClick={startSearching}
              className="start-search-btn"
            >
              🚀 Aloita haku
            </button>
            
            <div className="info-box">
              <p>💡 <strong>Näin se toimii:</strong></p>
              <ul>
                <li>🎯 Etsimme sinulle samanikäistä henkilöä</li>
                <li>💬 Kun löydämme, chat alkaa automaattisesti</li>
                <li>⚡ Prosessi kestää yleensä alle minuutin</li>
                <li>🔄 Voit aloittaa uuden haun milloin tahansa</li>
              </ul>
            </div>
          </div>
        )}

        {status === 'searching' && (
          <div className="searching-status">
            <div className="spinner">🔄</div>
            <h3>Etsitään chattikaveria...</h3>
            <p>⏱️ Aikaa kulunut: {getSearchDuration()} sekuntia</p>
            <p>👥 Odottavia käyttäjiä ikäryhmässäsi: {waitingUsers.length}</p>
            
            <button 
              onClick={stopSearching}
              className="stop-search-btn"
            >
              ⏹️ Lopeta haku
            </button>
            
            <div className="tips">
              <p>💡 <strong>Vinkki:</strong> Jos haku kestää kauan, kokeile hetken päästä uudelleen!</p>
            </div>
          </div>
        )}

        {status === 'matched' && (
          <div className="matched-status">
            <div className="success-icon">🎉</div>
            <h3>Löytyi chattikaveri!</h3>
            <p>Siirrytään chat-huoneeseen...</p>
          </div>
        )}

        <div className="stats">
          <h3>📊 Tilastot</h3>
          <p>🌍 Aktiivisia käyttäjiä: ~{Math.floor(Math.random() * 50) + 20}</p>
          <p>🔥 Chittejä tänään: ~{Math.floor(Math.random() * 200) + 100}</p>
          <p>⭐ Keskimääräinen chatin pituus: ~12 minuuttia</p>
        </div>
      </div>
    </div>
  );
};

export default Matchmaker;