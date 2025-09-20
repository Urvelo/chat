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
  console.log("Matchmaker saanut props:", { 
    user: !!user, 
    profile: !!profile,
    profileAgeGroup: profile?.ageGroup
  });

  // Kuuntele odottavia käyttäjiä (KAIKKI, ei vain sama ikäryhmä)
  useEffect(() => {
    const q = query(collection(db, 'waiting'));

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
  }, [user.uid]); // Ei enää riippuvuutta ikäryhmästä

  // Kuuntele aktiivisten käyttäjien määrää
  useEffect(() => {
    const unsubscribeWaiting = onSnapshot(collection(db, 'waiting'), (snapshot) => {
      setActiveUsersCount(snapshot.size);
    });

    return unsubscribeWaiting;
  }, []);

  // Automaattinen status-reset jos jumittuu
  useEffect(() => {
    if (status !== 'idle' && status !== 'searching' && status !== 'matched') {
      console.log("🔄 Automaattinen status-reset:", status, "-> idle");
      setStatus('idle');
      setIsSearching(false);
    }
  }, [status]);

    // Optimoitu siivous: vähemmän aggressiivinen ja tehokkaampi
  useEffect(() => {
    const optimizedCleanup = async () => {
      try {
        const now = Date.now();
        const TEN_MINUTES_AGO = now - (10 * 60 * 1000); // Kasvatettu 5min -> 10min
        
        console.log("🧹 Suoritetaan kevyt siivous...");
        
        // Käytä vain yhdistettyjä kyselyitä ja ehtojen optimointia
        const [waitingSnapshot, roomsSnapshot] = await Promise.all([
          getDocs(collection(db, 'waiting')),
          getDocs(collection(db, 'rooms'))
        ]);
        
        // Siivoa vain jos löytyy paljon vanhentuneita dokumentteja
        const staleWaiting = waitingSnapshot.docs.filter(doc => {
          const age = now - (doc.data().timestamp || 0);
          return age > TEN_MINUTES_AGO;
        });
        
        const staleRooms = roomsSnapshot.docs.filter(doc => {
          const data = doc.data();
          const age = now - (data.createdAt?.toDate?.()?.getTime() || 0);
          return age > TEN_MINUTES_AGO || data.isActive === false;
        });
        
        // Siivoa vain jos kannattaa (yli 3 dokumenttia)
        if (staleWaiting.length > 3) {
          console.log(`🗑️ Siivotaan ${staleWaiting.length} vanhaa waiting-käyttäjää`);
          await Promise.all(staleWaiting.map(doc => deleteDoc(doc.ref)));
        }
        
        if (staleRooms.length > 3) {
          console.log(`🗑️ Siivotaan ${staleRooms.length} vanhaa huonetta`);
          await Promise.all(staleRooms.map(doc => deleteDoc(doc.ref)));
        }
        
      } catch (error) {
        console.error("❌ Virhe optimoidussa siivouksessa:", error);
      }
    };

    // Siivous vain kerran komponentin latauksen yhteydessä
    optimizedCleanup();
    
    // Sitten harvemmmin - 5 minuutin välein sen sijaan että 30s
    const interval = setInterval(optimizedCleanup, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Cleanup musiikki ja timeoutit kun komponentti poistuu
  useEffect(() => {
    return () => {
      // Pysäytä musiikki kun poistutaan Matchmaker-komponentista
      if (window.backgroundMusic) {
        window.backgroundMusic.pause();
        window.backgroundMusic.currentTime = 0;
        window.backgroundMusic = null;
      }
      
      // 🔧 MEMORY LEAK FIX: Siivoa fallback timeout
      if (window.matchmakerFallbackTimeout) {
        clearTimeout(window.matchmakerFallbackTimeout);
        window.matchmakerFallbackTimeout = null;
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
      
      // Korjaa oma profiili jos ageGroup puuttuu (sama logiikka kuin startSearching:ssä)
      let workingProfile = { ...profile };
      if (!workingProfile.ageGroup) {
        console.log("🔧 Korjataan profiili createChatRoom:ssa - lisätään ageGroup");
        const calculateAgeGroup = (age) => {
          if (age >= 15 && age <= 17) return '15-17';
          return '18+';
        };
        const ageToUse = user.age || profile.age || 18;
        workingProfile.ageGroup = calculateAgeGroup(ageToUse);
      }
      
      // Validoi oma profiili
      if (!workingProfile?.displayName || !workingProfile?.ageGroup) {
        console.error("❌ Oma profiili puutteellinen:", workingProfile);
        setStatus('error');
        return;
      }
      
      // 🔒 ESTÄ TUPLIEN LUONTI: Tarkista onko jo olemassa huone näiden käyttäjien välillä
      const existingRoomsQuery = query(
        collection(db, 'rooms'),
        where('userIds', 'array-contains', user.uid)
      );
      const existingSnapshot = await getDocs(existingRoomsQuery);
      
      const hasExistingRoom = existingSnapshot.docs.some(roomDoc => {
        const data = roomDoc.data();
        const userIds = data.userIds || [];
        return userIds.includes(otherUser.id) && data.isActive;
      });
      
      if (hasExistingRoom) {
        console.log("⚠️ Huone näiden käyttäjien välillä on jo olemassa, ei luoda uutta");
        setStatus('idle');
        setIsSearching(false);
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
            displayName: workingProfile.displayName,
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
        ageGroup: workingProfile.ageGroup,
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
      
      // Merkitse itsemme valmiiksi huoneessa - päivitä koko users array säilyttäen sen arrayna
      const userIndex = roomData.users.findIndex(u => u.uid === user.uid);
      const updatedUsers = [...roomData.users];
      updatedUsers[userIndex] = { ...updatedUsers[userIndex], ready: true };
      
      await updateDoc(doc(db, 'rooms', actualRoomId), {
        users: updatedUsers
      });
      
      // Poista molemmat käyttäjät waiting-listasta - lisää viive estämään race condition
      await Promise.all([
        deleteDoc(doc(db, 'waiting', user.uid)).catch(e => console.warn("Oman waiting-poisto epäonnistui:", e)),
        deleteDoc(doc(db, 'waiting', otherUser.id)).catch(e => console.warn("Toisen waiting-poisto epäonnistui:", e))
      ]);
      
      // Pieni viive ennen siirtymistä chatiin - antaa aikaa Firestorelle synkronoida
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    if (isSearching) return;
    
    try {
      // 🧹 SIIVOA ENSIN: Poista kaikki vanhat jäänteet tältä käyttäjältä
      try {
        // Poista mahdollinen vanha waiting-merkintä
        await deleteDoc(doc(db, 'waiting', user.uid)).catch(e => console.log("Ei vanhaa waiting-merkintää"));
        
        // Etsi ja poista kaikki vanhat epäaktiiviset huoneet joissa tämä käyttäjä on mukana
        const oldRoomsQuery = query(
          collection(db, 'rooms'),
          where('userIds', 'array-contains', user.uid)
        );
        const oldRoomsSnapshot = await getDocs(oldRoomsQuery);
        
        const cleanupPromises = [];
        oldRoomsSnapshot.docs.forEach(roomDoc => {
          const data = roomDoc.data();
          const roomAge = Date.now() - (data.createdAt?.toDate?.()?.getTime() || 0);
          
          // Poista vanhat (yli 3 min) tai epäaktiiviset huoneet - vähemmän aggressiivinen
          if (roomAge > 180000 || data.isActive === false) {
            console.log("🧹 Siivotaan vanha huone käyttäjältä:", roomDoc.id);
            cleanupPromises.push(deleteDoc(doc(db, 'rooms', roomDoc.id)));
          }
        });
        
        if (cleanupPromises.length > 0) {
          await Promise.all(cleanupPromises);
          console.log(`🧹 Siivottiin ${cleanupPromises.length} vanhaa huonetta käyttäjältä`);
        }
      } catch (cleanupError) {
        console.warn("⚠️ Siivous epäonnistui osittain:", cleanupError);
      }
      
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
          return '18+'; // Kaikki 18+ samaan ryhmään
        };
        
        const ageToUse = user.age || profile.age || 18; // Fallback 18
        workingProfile.ageGroup = calculateAgeGroup(ageToUse);
        
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
      
      // Tarkista onko jo odottavia käyttäjiä (ikäpohjainen valinta)
      if (waitingUsers.length > 0) {
        // Sama logiikka kuin onSnapshotissa: sama ikäryhmä ensin, sitten nuorimmat
        const sameAgeGroup = waitingUsers.filter(u => u.ageGroup === workingProfile.ageGroup);
        let selectedUser;
        
        if (sameAgeGroup.length > 0) {
          sameAgeGroup.sort((a, b) => (a.age || 18) - (b.age || 18));
          selectedUser = sameAgeGroup[0];
        } else {
          waitingUsers.sort((a, b) => (a.age || 18) - (b.age || 18));
          selectedUser = waitingUsers[0];
        }
        
        await createChatRoom(selectedUser);
        return;
      }
      
      // Lisää itsensä waiting-listaan käyttäen user.uid:tä ID:nä
      const waitingRef = doc(db, 'waiting', user.uid);
      await setDoc(waitingRef, {
        id: user.uid, // Käytä 'id' kenttää yhteensopivuuden vuoksi
        uid: user.uid, // Pidä uid myös
        name: workingProfile.displayName,
        ageGroup: workingProfile.ageGroup,
        age: user.age || profile.age, // Lisää ikä matchmaking varten
        timestamp: Date.now()
      });

      console.log("Lisätty waiting listaan:", user.uid, "nimi:", workingProfile.displayName, "ageGroup:", workingProfile.ageGroup);
      
      // 🚀 OPTIMOITU QUERY: Kuuntele ensisijaisesti omaa ikäryhmää
      const primaryQuery = query(
        collection(db, 'waiting'),
        where('ageGroup', '==', workingProfile.ageGroup)
      );
      
      // Fallback: jos ei löydy samasta ikäryhmästä, kuuntele kaikkia
      let fallbackTimeout;
      
      console.log("Aloitetaan kuuntelu omaa ikäryhmää:", workingProfile.ageGroup);
      
      // 📊 PERFORMANCE TRACKING: Aloita matching mittaus
      const matchingStartTime = performance.now();
      const matchingMetrics = {
        startTime: matchingStartTime,
        ageGroup: workingProfile.ageGroup,
        waitingUsersChecked: 0,
        queryExecutions: 0
      };
      
      const unsubscribe = onSnapshot(primaryQuery, async (snapshot) => {
        matchingMetrics.queryExecutions++;
        matchingMetrics.waitingUsersChecked = snapshot.size;
        
        console.log(`onSnapshot (ageGroup ${workingProfile.ageGroup}), löytyi dokumentteja:`, snapshot.size);
        
        if (!snapshot.empty && isSearching) {
          // 🔒 RACE CONDITION PROTECTION: Tarkista että ei ole jo aktiivista huonetta
          const preCheckQuery = query(
            collection(db, 'rooms'),
            where('userIds', 'array-contains', user.uid),
            where('isActive', '==', true)
          );
          
          const preCheckSnapshot = await getDocs(preCheckQuery);
          if (!preCheckSnapshot.empty) {
            console.log("⚠️ Pre-check: Käyttäjällä on jo aktiivinen huone, lopetetaan haku");
            unsubscribe();
            return;
          }
          
          const allWaitingUsers = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(waitingUser => waitingUser.uid !== user.uid); // Suodata oma uid pois
          
          console.log("Waiting käyttäjät (ilman omaa):", allWaitingUsers);
          
          if (allWaitingUsers.length > 0) {
            // 🎯 OPTIMOITU: Kaikki löydetyt ovat samasta ikäryhmästä, valitse nuorin
            allWaitingUsers.sort((a, b) => (a.age || 18) - (b.age || 18));
            const selectedUser = allWaitingUsers[0];
            console.log("🎯 Valittu nuorin samasta ikäryhmästä:", selectedUser.age, "vuotta");
            
            console.log("Löytyi match (sama ikäryhmä):", selectedUser);
            
            // 📊 PERFORMANCE METRICS: Kirjaa matching-aika
            const matchingEndTime = performance.now();
            const matchingDuration = matchingEndTime - matchingMetrics.startTime;
            
            console.log(`🏆 MATCHING METRICS:`, {
              duration: `${matchingDuration.toFixed(2)}ms`,
              ageGroup: matchingMetrics.ageGroup,
              waitingUsersChecked: matchingMetrics.waitingUsersChecked,
              queryExecutions: matchingMetrics.queryExecutions,
              matchType: 'primary-agegroup'
            });
            
            // 🔒 TARKISTA VIELÄ KERRAN että meillä ei ole jo huonetta tämän käyttäjän kanssa
            const doubleCheckQuery = query(
              collection(db, 'rooms'),
              where('userIds', 'array-contains', user.uid)
            );
            
            try {
              const doubleCheckSnapshot = await getDocs(doubleCheckQuery);
              const hasActiveRoom = doubleCheckSnapshot.docs.some(roomDoc => {
                const data = roomDoc.data();
                const userIds = data.userIds || [];
                return userIds.includes(selectedUser.id) && data.isActive;
              });
              
              if (hasActiveRoom) {
                console.log("⚠️ Double-check: Huone on jo olemassa, ohitetaan match");
                return;
              }
              
              // ✅ Kaikki kunnossa, luodaan huone
              setStatus('Löytyi match! Luodaan chat...');
              unsubscribe(); // Lopeta kuuntelu
              
              await createChatRoom(selectedUser);
              
            } catch (doubleCheckError) {
              console.error("❌ Virhe double-check:ssä:", doubleCheckError);
              // Jatka normaalisti jos tarkistus epäonnistuu
              setStatus('Löytyi match! Luodaan chat...');
              unsubscribe(); // Lopeta kuuntelu
              await createChatRoom(selectedUser);
            }
          }
        } else if (isSearching) {
          // 🔄 FALLBACK: Jos omasta ikäryhmästä ei löydy ketään, kokeile 10s kuluttua kaikkia
          if (!fallbackTimeout) {
            console.log("⏳ Ei löytynyt omasta ikäryhmästä, aloitetaan fallback 10s kuluttua...");
            window.matchmakerFallbackTimeout = setTimeout(async () => {
              if (!isSearching) return; // Lopetettu jo
              
              console.log("🔄 Fallback: kuunnellaan kaikkia ikäryhmiä...");
              
              // Vaihda kuuntelemaan kaikkia käyttäjiä  
              unsubscribe(); // Lopeta nykyinen listener
              
              const fallbackQuery = query(collection(db, 'waiting'));
              const fallbackUnsubscribe = onSnapshot(fallbackQuery, async (fallbackSnapshot) => {
                if (!fallbackSnapshot.empty && isSearching) {
                  const allUsers = fallbackSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(u => u.uid !== user.uid);
                    
                  if (allUsers.length > 0) {
                    // Valitse nuorin kaikista
                    allUsers.sort((a, b) => (a.age || 18) - (b.age || 18));
                    const selectedUser = allUsers[0];
                    console.log("🔄 Fallback match:", selectedUser);
                    
                    // 📊 FALLBACK METRICS
                    const fallbackEndTime = performance.now();
                    const totalDuration = fallbackEndTime - matchingMetrics.startTime;
                    
                    console.log(`🔄 FALLBACK METRICS:`, {
                      totalDuration: `${totalDuration.toFixed(2)}ms`,
                      fallbackDelay: '10000ms',
                      matchType: 'fallback-all-ages'
                    });
                    
                    setStatus('Löytyi match! Luodaan chat...');
                    fallbackUnsubscribe();
                    await createChatRoom(selectedUser);
                  }
                }
              });
              
              setUnsubscribe(() => fallbackUnsubscribe);
            }, 10000); // 10 sekunnin fallback
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

  // Lopeta etsintä ja siivoa kaikki resurssit
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
      
      // 🔧 MEMORY LEAK FIX: Siivoa fallback timeout
      if (window.matchmakerFallbackTimeout) {
        clearTimeout(window.matchmakerFallbackTimeout);
        window.matchmakerFallbackTimeout = null;
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
            <p>👥 Aktiivisia käyttäjiä sivustolla: {activeUsersCount}</p>
            
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