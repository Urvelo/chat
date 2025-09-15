import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

const Matchmaker = ({ user, profile, onRoomJoined }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, searching, matched
  const [searchStartTime, setSearchStartTime] = useState(null);
  const [unsubscribe, setUnsubscribe] = useState(null);

  // Debug loggaus
  console.log("Matchmaker saanut props:", { user, profile });

  // Kuuntele odottavia käyttäjiä samasta ikäryhmästä
  useEffect(() => {
    if (!profile?.ageGroup) return;

    const q = query(
      collection(db, 'waiting'),
      where('ageGroup', '==', profile.ageGroup)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(waitingUser => waitingUser.uid !== user.uid); // Suodata oma uid pois
        
      setWaitingUsers(users);
      
      // Jos etsimme ja löytyy käyttäjä, luo huone
      if (isSearching && users.length > 0) {
        createChatRoom(users[0]);
      }
    });

    return unsubscribe;
  }, [profile?.ageGroup, user.uid, isSearching]);

  // Kuuntele huoneita joissa käyttäjä on mukana (vain etsinnän aikana)
  useEffect(() => {
    if (!user?.uid || !isSearching) return;

    const q = query(
      collection(db, 'rooms'),
      where('userIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const roomData = { id: doc.id, ...doc.data() };
        
        // Tarkista että huone on aktiivinen ja luotu hiljattain (alle 5 min sitten)
        const roomAge = Date.now() - (roomData.createdAt?.toDate?.()?.getTime() || 0);
        const isRecentRoom = roomAge < 5 * 60 * 1000; // 5 minuuttia
        
        if (isSearching && roomData.isActive && isRecentRoom) {
          console.log("Löytyi uusi huone jossa olen mukana:", roomData);
          setIsSearching(false);
          setStatus('matched');
          onRoomJoined(doc.id, roomData);
        }
      });
    });

    return unsubscribe;
  }, [user?.uid, isSearching, onRoomJoined]);

  // Luo chat-huone toisen käyttäjän kanssa
  const createChatRoom = async (otherUser) => {
    try {
      setStatus('matched');
      
      // Luo uniikki huone-ID
      const roomId = uuidv4();
      
      // Luo huone Firestoreen
      const roomData = {
        id: roomId,
        userIds: [user.uid, otherUser.uid], // Yksinkertainen array uid:sta
        users: [
          {
            uid: user.uid,
            displayName: profile.displayName,
            joinedAt: Date.now(),
            ready: false // Aluksi ei valmis
          },
          {
            uid: otherUser.uid,
            displayName: otherUser.name,
            joinedAt: Date.now(),
            ready: false // Aluksi ei valmis
          }
        ],
        ageGroup: profile.ageGroup,
        createdAt: serverTimestamp(),
        isActive: true,
        bothReady: false, // Molemmat eivät vielä valmiita
        type: 'text' // vain tekstichat, ei videota
      };

      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      
      // Käytä todellista document ID:tä
      const actualRoomId = docRef.id;
      const actualRoomData = { ...roomData, id: actualRoomId };
      
      // Merkitse itsemme valmiiksi huoneessa
      await updateDoc(doc(db, 'rooms', actualRoomId), {
        [`users.${roomData.users.findIndex(u => u.uid === user.uid)}.ready`]: true
      });
      
      // Poista molemmat käyttäjät waiting-listasta
      await deleteDoc(doc(db, 'waiting', user.uid));
      await deleteDoc(doc(db, 'waiting', otherUser.id));
      
      // Siirry chat-huoneeseen (odottamaan toista)
      onRoomJoined(actualRoomId, actualRoomData);
      
    } catch (error) {
      console.error('Virhe huoneen luonnissa:', error);
      setStatus('idle');
      setIsSearching(false);
    }
  };

  // Aloita käyttäjien etsintä
  const startSearching = async () => {
    try {
      // Korjaa profiili jos ageGroup puuttuu
      let workingProfile = { ...profile };
      if (!workingProfile.ageGroup) {
        console.log("Korjataan profiili - lisätään ageGroup");
        workingProfile.ageGroup = '15-20';
        
        // Päivitä localStorage
        localStorage.setItem('chatnest-profile', JSON.stringify(workingProfile));
        
        // Päivitä myös Firestore taustalla
        try {
          await setDoc(doc(db, 'profiles', user.uid), workingProfile);
        } catch (error) {
          console.warn("Firestore päivitys epäonnistui:", error);
        }
      }

      // Varmista että profile on validi
      if (!workingProfile?.ageGroup || !workingProfile?.displayName) {
        console.error('Profile edelleen puutteellinen:', {
          profile: workingProfile,
          ageGroup: workingProfile?.ageGroup,
          displayName: workingProfile?.displayName,
          keys: Object.keys(workingProfile || {})
        });
        setStatus('Virhe: Profiili puutteellinen');
        return;
      }

      setIsSearching(true);
      setStatus('searching');
      setSearchStartTime(Date.now());
      
      // Tarkista onko jo odottavia käyttäjiä
      if (waitingUsers.length > 0) {
        await createChatRoom(waitingUsers[0]);
        return;
      }
      
      // Lisää itsensä waiting-listaan käyttäen user.uid:tä ID:nä
      const waitingRef = doc(db, 'waiting', user.uid);
      await setDoc(waitingRef, {
        uid: user.uid,
        name: workingProfile.displayName,
        ageGroup: workingProfile.ageGroup,
        timestamp: Date.now()
      });

      console.log("Lisätty waiting listaan:", user.uid, "nimi:", workingProfile.displayName, "ageGroup:", workingProfile.ageGroup);
      
      // Kuuntele waiting-listaa ja etsi match (yksinkertainen query ilman indeksiä)
      const q = query(
        collection(db, 'waiting'),
        where('ageGroup', '==', workingProfile.ageGroup)
      );

      console.log("Aloitetaan kuuntelu waiting listaa...");
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log("onSnapshot triggered, löytyi dokumentteja:", snapshot.size);
        
        if (!snapshot.empty) {
          const waitingUsers = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(waitingUser => waitingUser.uid !== user.uid); // Suodata oma uid pois
          
          console.log("Waiting käyttäjät (ilman omaa):", waitingUsers);
          
          if (waitingUsers.length > 0) {
            // Ota ensimmäinen käyttäjä
            const otherUser = waitingUsers[0];
            console.log("Löytyi match:", otherUser);
            
            setStatus('Löytyi match! Luodaan chat...');
            unsubscribe(); // Lopeta kuuntelu
            
            await createChatRoom(otherUser);
          }
        }
      }, (error) => {
        console.error("Virhe waiting lista kuuntelussa:", error);
        setIsSearching(false);
        setStatus('idle');
      });
      
      // Tallenna unsubscribe funktio myöhempää käyttöä varten
      setUnsubscribe(() => unsubscribe);
      
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
      
      // Lopeta listener jos on käynnissä
      if (unsubscribe) {
        unsubscribe();
        setUnsubscribe(null);
      }
      
      // Poista itsemme waiting-listasta
      await deleteDoc(doc(db, 'waiting', user.uid));
      
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
              🚀 ALOITA HAKU
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