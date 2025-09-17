import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, getDocs, getDoc, db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import FeedbackModal from './FeedbackModal';

const Matchmaker = ({ user, profile, onRoomJoined }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, searching, matched
  const [searchStartTime, setSearchStartTime] = useState(null);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [playMusic, setPlayMusic] = useState(() => localStorage.getItem("playMusic") !== "false");

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
      
      // ❌ POISTETTU AUTOMAATTINEN ROOM LUONTI
      // Tämä rikkoi olemassa olevia pareja kun kolmas käyttäjä tuli mukaan
      // Nyt matchmaking tapahtuu vain startSearching funktiossa
    });

    return unsubscribe;
  }, [profile?.ageGroup, user.uid]);

  // Kuuntele aktiivisten käyttäjien määrää
  useEffect(() => {
    const unsubscribeWaiting = onSnapshot(collection(db, 'waiting'), (snapshot) => {
      setActiveUsersCount(snapshot.size);
    });

    return unsubscribeWaiting;
  }, []);

    // Siivoa vanhat huoneet automaattisesti
  useEffect(() => {
    const cleanupOldRooms = async () => {
      try {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // Hae vanhat huoneet
        const roomsQuery = query(collection(db, 'rooms'));
        const snapshot = await getDocs(roomsQuery);
        
        const deletePromises = [];
        
        snapshot.docs.forEach(roomDoc => {
          const data = roomDoc.data();
          const roomAge = now - (data.createdAt?.toDate?.()?.getTime() || 0);
          
          // Poista yli 5 minuuttia vanhat tai epäaktiiviset huoneet
          if (roomAge > fiveMinutesAgo || !data.isActive) {
            console.log("🗑️ Poistetaan vanha huone:", roomDoc.id);
            deletePromises.push(deleteDoc(doc(db, 'rooms', roomDoc.id)));
          }
        });
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
          console.log(`✅ Siivottiin ${deletePromises.length} vanhaa huonetta`);
        }
      } catch (error) {
        console.error("❌ Virhe huoneiden siivouksessa:", error);
      }
    };

    // Suorita siivous heti ja sitten 30 sekunnin välein
    cleanupOldRooms();
    const interval = setInterval(cleanupOldRooms, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Cleanup musiikki kun komponentti poistuu
  useEffect(() => {
    return () => {
      // Pysäytä musiikki kun poistutaan Matchmaker-komponentista
      if (window.backgroundMusic) {
        window.backgroundMusic.pause();
        window.backgroundMusic.currentTime = 0;
        window.backgroundMusic = null;
      }
    };
  }, []);

  // Kuuntele localStorage-muutoksia (musiikki-asetukset)
  useEffect(() => {
    const handleStorageChange = () => {
      const musicSetting = localStorage.getItem("playMusic") !== "false";
      setPlayMusic(musicSetting);
    };

    // Kuuntele storage-tapahtumia (toinen välilehti muuttaa asetusta)
    window.addEventListener('storage', handleStorageChange);
    
    // Kuuntele myös custom-tapahtumaa samalla välilehdellä
    window.addEventListener('musicSettingChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('musicSettingChanged', handleStorageChange);
    };
  }, []);

  // Aloita musiikki automaattisesti oletuksena
  useEffect(() => {
    if (playMusic) {
      // Varmista ettei musiikki jo soi
      if (!window.backgroundMusic) {
        const audio = new Audio('/meditation-relaxing-music-293922.mp3');
        audio.volume = 0.15;
        audio.loop = true;
        
        audio.play().catch(error => {
          console.log("Automaattinen musiikki estetty selaimessa:", error);
        });
        
        window.backgroundMusic = audio;
      }
    } else {
      // Pysäytä musiikki jos asetus on pois päältä
      if (window.backgroundMusic) {
        window.backgroundMusic.pause();
        window.backgroundMusic.currentTime = 0;
        window.backgroundMusic = null;
      }
    }
  }, [playMusic]); // Lisätty playMusic riippuvuudeksi

  // Kuuntele olemassa olevia huoneita joissa käyttäjä on mukana - korjattu versio
  useEffect(() => {
    if (!user?.uid || !isSearching) return;

    const q = query(
      collection(db, 'rooms'),
      where('userIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Käsittele vain uusimmat muutokset tässä sessiossa
      const changes = snapshot.docChanges().filter(change => change.type === 'added');
      
      changes.forEach(change => {
        const roomData = { id: change.doc.id, ...change.doc.data() };
        
        // Varmista että roomData on validia
        if (!roomData || !roomData.users || !Array.isArray(roomData.users)) {
          console.warn("⚠️ Virheellinen huonedata, ohitetaan:", roomData);
          return;
        }
        
        // Tarkista että huone on äsken luotu (alle 30 sekuntia sitten)
        const roomAge = Date.now() - (roomData.createdAt?.toDate?.()?.getTime() || 0);
        const isNewRoom = roomAge < 30 * 1000; // 30 sekuntia
        
        if (roomData.isActive && isNewRoom) {
          console.log("🆕 Löytyi uusi huone jossa olen mukana:", roomData.id);
          setIsSearching(false);
          setStatus('matched');
          onRoomJoined(change.doc.id, roomData);
        } else {
          console.log("⏰ Huone liian vanha tai epäaktiivinen, ohitetaan:", {
            age: Math.round(roomAge / 1000),
            isActive: roomData.isActive
          });
        }
      });
    }, (error) => {
      console.error("❌ Virhe huoneiden kuuntelussa:", error);
    });

    return unsubscribe;
  }, [user?.uid, isSearching, onRoomJoined]);

  // Luo chat-huone toisen käyttäjän kanssa
  const createChatRoom = async (otherUser) => {
    try {
      console.log("🏗️ Luodaan huone toisen käyttäjän kanssa:", otherUser);
      
      // Validoi otherUser
      if (!otherUser || !otherUser.id || !otherUser.name) {
        console.error("❌ Virheellinen otherUser:", otherUser);
        setStatus('error');
        return;
      }
      
      // Validoi oma profiili
      if (!profile?.displayName || !profile?.ageGroup) {
        console.error("❌ Oma profiili puutteellinen:", profile);
        setStatus('error');
        return;
      }
      
      setStatus('matched');
      
      // Luo uniikki huone-ID
      const roomId = uuidv4();
      
      // Luo huone Firestoreen
      const roomData = {
        id: roomId,
        userIds: [user.uid, otherUser.id], // Käytä otherUser.id eikä .uid
        users: [
          {
            uid: user.uid,
            displayName: profile.displayName,
            joinedAt: Date.now(),
            ready: false // Aluksi ei valmis
          },
          {
            uid: otherUser.id, // Käytä otherUser.id eikä .uid
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

      console.log("💾 Tallennettava roomData:", roomData);

      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      
      // Käytä todellista document ID:tä
      const actualRoomId = docRef.id;
      const actualRoomData = { ...roomData, id: actualRoomId };
      
      console.log("✅ Huone luotu ID:llä:", actualRoomId);
      
      // Merkitse itsemme valmiiksi huoneessa
      await updateDoc(doc(db, 'rooms', actualRoomId), {
        [`users.${roomData.users.findIndex(u => u.uid === user.uid)}.ready`]: true
      });
      
      // Poista molemmat käyttäjät waiting-listasta
      await deleteDoc(doc(db, 'waiting', user.uid));
      await deleteDoc(doc(db, 'waiting', otherUser.id));
      
      console.log("🎉 Siirtymä chat-huoneeseen");
      
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
      // Tarkista onko käyttäjä bannattu tai temp-bannattu
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        
        // Tarkista ikuinen bänni
        if (profileData.banned) {
          alert('Et voi käyttää palvelua. Syy: ' + (profileData.bannedReason || 'Käyttöehtojen rikkominen'));
          return;
        }
        
        // Tarkista väliaikainen bänni
        if (profileData.temporaryBan?.active) {
          const bannedUntil = profileData.temporaryBan.bannedUntil.toDate ? 
            profileData.temporaryBan.bannedUntil.toDate() : 
            new Date(profileData.temporaryBan.bannedUntil);
          
          if (new Date() < bannedUntil) {
            // Temp-bänni on vielä voimassa
            const timeLeft = Math.ceil((bannedUntil - new Date()) / (1000 * 60 * 60)); // tunnit
            alert(`Et voi käyttää palvelua vielä ${timeLeft} tuntia. Syy: ${profileData.temporaryBan.reason}`);
            return;
          } else {
            // Temp-bänni on vanhentunut, poista se
            console.log("🔓 Väliaikainen bänni vanhentunut, poistetaan");
            await updateDoc(profileRef, {
              'temporaryBan.active': false
            });
          }
        }
      }
      
      // Korjaa profiili jos ageGroup puuttuu
      let workingProfile = { ...profile };
      if (!workingProfile.ageGroup) {
        console.log("Korjataan profiili - lisätään ageGroup");
        
        // Laske ikäryhmä käyttäjän iän perusteella
        const calculateAgeGroup = (age) => {
          if (age >= 15 && age <= 17) return '15-17';
          if (age >= 18 && age <= 25) return '18-25';
          return '25+';
        };
        
        workingProfile.ageGroup = calculateAgeGroup(user.age);
        
        // Päivitä Firestore taustalla
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
        id: user.uid, // Käytä 'id' kenttää yhteensopivuuden vuoksi
        uid: user.uid, // Pidä uid myös
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
          
          // ✅ KORJATTU: Tarkista että olemmeko edelleen etsimässä
          if (waitingUsers.length > 0 && isSearching) {
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

  // Piilotus-toiminto poistettu käyttäjän pyynnöstä

  // Laske etsintäaika
  const getSearchDuration = () => {
    if (!searchStartTime) return 0;
    return Math.floor((Date.now() - searchStartTime) / 1000);
  };

  return (
    <div className="matchmaker-container">
      <div className="matchmaker-content">
        <h2>🔍 Etsi chattikaveria</h2>
        
        {/* Aktiivisten käyttäjien näyttö */}
        <div className="user-stats">
          <p>👥 Käyttäjät sivustolla: <strong>{activeUsersCount}</strong></p>
          <button 
            onClick={() => setShowFeedbackModal(true)} 
            className="feedback-link-btn"
          >
            💬 Anna palautetta
          </button>
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
      </div>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </div>
  );
};

export default Matchmaker;