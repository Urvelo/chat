import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, storage, ref, uploadBytes, getDownloadURL, deleteObject } from '../firebase';
import { smartModerationService } from '../utils/smart-moderation.js';
import { handleInappropriateContent, isUserBanned, BAN_REASONS } from '../utils/ban-system.js';
// Firebase Functions moderointi poistettu - käytetään vain offline-moderointia
import FeedbackModal from './FeedbackModal';

const ChatRoom = ({ user, profile, roomId, roomData, onLeaveRoom }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomReady, setRoomReady] = useState(false);
  const [waitingForOther, setWaitingForOther] = useState(true);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [playMusic, setPlayMusic] = useState(() => localStorage.getItem("playMusic") !== "false");
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [userBanStatus, setUserBanStatus] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const joinSoundRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasFastLeftRef = useRef(false);
  const roomActiveRef = useRef(true);

  // Hae toisen käyttäjän tiedot - memoized ja turvallinen
  const otherUser = useMemo(() => {
    const users = roomData?.users;
    if (!Array.isArray(users)) return null;
    return users.find(u => u?.uid && u.uid !== user?.uid) || null;
  }, [roomData?.users, user?.uid]);

  // Kuuntele huoneen valmiutta
  useEffect(() => {
    if (!roomId) return;

    console.log("Kuunnellaan huoneen valmiutta:", roomId);

    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Jos huone on merkitty epäaktiiviseksi, poistu heti
        if (data.isActive === false) {
          console.warn('⚠️ Huone merkitty päättyneeksi, poistutaan:', roomId);
          roomActiveRef.current = false;
          onLeaveRoom();
          return;
        }
        
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
        console.log("🔄 ChatRoom ready status:"); 
        console.log("  - roomReady:", isReady);
        console.log("  - roomId:", roomId);
        console.log("  - imageUploading:", imageUploading);
        console.log("  - userBanned:", userBanStatus?.banned);
        console.log("  - imgbbKey:", !!import.meta.env.VITE_IMGBB_API_KEY);
        console.log("  - imgbbKey value:", import.meta.env.VITE_IMGBB_API_KEY);
        console.log("  - all env vars:", import.meta.env);
        console.log("  - profileAge:", profile?.age);
        console.log("  - isOver18:", profile?.age >= 18);
        console.log("  - imageButtonDisabled:", (!isReady || imageUploading || userBanStatus?.banned || !profile?.age || profile.age < 18));
        setRoomReady(isReady);
        setWaitingForOther(false);
      } else {
        console.warn("⚠️ Huone ei enää ole olemassa:", roomId);
        // Huone on poistettu, palaa takaisin
        roomActiveRef.current = false;
        onLeaveRoom();
      }
    }, (error) => {
      console.error("❌ Virhe huoneen kuuntelussa:", error);
      // Jos kuuntelu epäonnistuu, palaa takaisin
      roomActiveRef.current = false;
      onLeaveRoom();
    });

    return unsubscribe;
  }, [roomId]);

  // Tarkista käyttäjän banni-tila
  useEffect(() => {
    const checkBanStatus = async () => {
      if (!user?.uid) return;
      
      try {
        const banStatus = await isUserBanned(user.uid);
        setUserBanStatus(banStatus);
        
        if (banStatus.banned) {
          console.log('🚫 Käyttäjä on bannattu:', banStatus);
        }
      } catch (error) {
        console.error('❌ Virhe banni-tilan tarkistuksessa:', error);
      }
    };

    checkBanStatus();
    
    // Tarkista banni-tila säännöllisesti (5 min välein)
    const interval = setInterval(checkBanStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user?.uid]);

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

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log("Viestejä löytyi:", snapshot.size);
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 🛡️ OFFLINE MODEROINTI - Tarkista uudet viestit
      if (messageList.length > 0) {
        for (const message of messageList) {
          // Tarkista vain viestit jotka eivät ole omia ja joita ei ole vielä moderoitu
          if (message.senderId !== user?.uid && !message.moderationChecked) {
            try {
              console.log(`🧠 Offline-moderoi viestiä: "${message.text}"`);
              
              const moderationResult = await smartModerationService.moderateMessage(
                message.text, 
                message.senderId
              );
              
              console.log('📊 Offline moderation tulos:', moderationResult);
              
              // Jos viesti on haitallinen, merkitse se
              if (moderationResult.isHarmful) {
                console.log(`⚠️ HAITALLINEN VIESTI HAVAITTU: ${message.text}`);
                // Offline-moderointi toimii, mutta ei tarvitse tallentaa Firestoreen
              }
              
            } catch (error) {
              console.error('❌ Virhe offline-moderoinnissa:', error);
            }
          }
        }
      }
      
      setMessages(messageList);
      setLoading(false);
    }, (error) => {
      console.error("Virhe viestien kuuntelussa:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [roomId, roomReady]);

  // Kuuntele typing-indikaattoreita
  useEffect(() => {
    if (!roomId || !roomReady || !user?.uid) return;

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const roomData = doc.data();
        const typingUsers = roomData.typingUsers || {};
        
        // Tarkista onko joku muu kirjoittamassa (ei itse)
        const otherUsersTyping = Object.entries(typingUsers)
          .filter(([userId, isTyping]) => userId !== user.uid && isTyping)
          .length > 0;
        
        setOtherUserTyping(otherUsersTyping);
      }
    });

    return unsubscribe;
  }, [roomId, roomReady, user?.uid]);

  // Optimoitu scrollaus-funktio
  const scrollToBottom = useCallback(() => {
    // ChatGPT-tyylinen scroll: vieritä viesti-container pohjaan
    const messagesContainer = document.querySelector('.chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Automaattinen scroll uusimpiin viesteihin - optimoitu versio
  useEffect(() => {
    if (messages.length === 0) return; // Ei scrollaa tyhjää
    
    // Välitön scroll ja viive varmistus
    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Input event handlerit - täytyy olla ennen useEffectiä
  const handleInputFocus = useCallback(() => {
    // Nopea reagointi mobiilissa
    if (window.innerWidth <= 768) {
      // Scroll bottom after keyboard shows - korjattu fixed input:lle
      setTimeout(scrollToBottom, 300); // Lisää aikaa näppäimistön avautumiselle
    }
  }, [scrollToBottom]);

  const handleInputBlur = useCallback(() => {
    // Scroll takaisin viesteihin kun poistetaan focus
    if (window.innerWidth <= 768) {
      setTimeout(scrollToBottom, 200);
    }
  }, [scrollToBottom]);

  // Mobile keyboard handling - optimoitu versio
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(scrollToBottom, 150);
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
  }, [handleInputFocus, handleInputBlur, scrollToBottom]);

  // Input-muutosten käsittely
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Typing-indikaattorin logiikka - käytä funktionaalista päivitystä
    if (value.trim()) {
      setIsTyping(prev => {
        if (!prev && roomId && user?.uid && roomActiveRef.current) {
          // Inline typing-päivitys välttääksemme dependency-ongelman
          const roomRef = doc(db, 'rooms', roomId);
          updateDoc(roomRef, {
            [`typingUsers.${user.uid}`]: true
          }).catch(error => {
            console.error("❌ Virhe typing-statuksen päivityksessä:", error);
          });
        }
        return true;
      });
    }
    
    // Nollaa timeout jos on olemassa
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Aseta uusi timeout joka lopettaa typing-statuksen
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (roomId && user?.uid && roomActiveRef.current) {
        const roomRef = doc(db, 'rooms', roomId);
        updateDoc(roomRef, {
          [`typingUsers.${user.uid}`]: false
        }).catch(error => {
          console.error("❌ Virhe typing-statuksen päivityksessä:", error);
        });
      }
    }, 1000); // 1 sekunnin kuluttua lopettaa typing
  }, [roomId, user?.uid]); // Yksinkertaisemmat riippuvuudet

  // ImgBB kuvan upload (24h auto-poisto)
  const uploadImageToImgBB = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const API_KEY = import.meta.env.VITE_IMGBB_API_KEY || 'b758ed1b7d747547e4ae4572aca54f79'; // Fallback production API key
    const EXPIRATION_24H = 24 * 60 * 60; // sekuntia

    console.log('🔑 Using API key:', API_KEY ? 'FOUND' : 'MISSING');

    if (!API_KEY) {
      throw new Error('ImgBB API-avain puuttuu (VITE_IMGBB_API_KEY). Tarkista .env tiedosto.');
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}&expiration=${EXPIRATION_24H}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ImgBB API virhe: ${response.status} ${text}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('ImgBB upload epäonnistui');
    }

    return {
      url: data.data.display_url,
      deleteUrl: data.data.delete_url,
      expiration: data.data.expiration
    };
  }, []);

  // Yksityinen kuva-upload Firebase Storageen (ei käytössä, jätetään talteen)
  const uploadImageToPrivateStorage = useCallback(async (file, roomId, userId) => {
    // Luo yksilöllinen polku private-kansioon
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const objectPath = `private/${roomId}/${userId}/${fileName}`;
    const storageRef = ref(storage, objectPath);

    // Lataa raakabittinä (contentType säilyy)
    await uploadBytes(storageRef, file, { contentType: file.type });
    
    // Luo allekirjoitettu lataus-URL (getDownloadURL kun säännöt sallii)
    // Huom: getDownloadURL toimii mikäli storage-säännöt sallivat authenticated-read
    const url = await getDownloadURL(storageRef);

    return { url, path: objectPath };
  }, []);

  // OpenAI kuvan moderointi - OIKEA ilmainen moderation API
  const moderateImage = useCallback(async (imageUrl) => {
    try {

      console.log('🖼️ Moderoidaan kuvaa OpenAI moderation API:lla:', imageUrl);
      
      // Tarkista että API-avain on asetettu
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ OpenAI API-avain puuttuu, sallitaan kuva ilman moderointia');
        return { flagged: false };
      }
      
      // Käytä OIKEAA ilmaista OpenAI moderation API:a omni-moderation-latest mallilla
      // Kuville pitää käyttää objekti formaattia
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI moderation API virhe:', response.status, errorText);
        
        // Jos moderation epäonnistuu, estä kuva turvallisuuden vuoksi
        throw new Error(`OpenAI moderation epäonnistui: ${response.status}`);
      }

      const data = await response.json();
      console.log('🤖 OpenAI moderation API vastaus:', data);
      
      // Tarkista että vastaus on oikeassa formaatissa
      if (!data.results || !data.results[0]) {
        throw new Error('OpenAI moderation palautti virheellisen vastauksen');
      }
      
      const result = data.results[0];

      // Debug: tulosta kategoriat ja pisteet
      const categories = result.categories || {};
      const scores = result.category_scores || {};
      console.log('🔍 Moderation result flagged:', result.flagged);
      console.log('🔍 Kaikki kategoriat:', categories);
      console.log('🔍 Kaikki scoret:', scores);

      // Säännöt (säädettävät .env:n kautta)
      const moderationLevel = import.meta.env.VITE_MODERATION_LEVEL || 'normal';
      
      let THRESHOLDS;
      switch (moderationLevel) {
        case 'strict':
          THRESHOLDS = {
            'sexual/minors': 0.00001,
            sexual: 0.1,              // Tiukka
            violence: 0.3,            // Tiukka
            'violence/graphic': 0.2,  // Tiukka
            harassment: 0.4           // Tiukka
          };
          break;
        case 'relaxed':
          THRESHOLDS = {
            'sexual/minors': 0.00001, // Aina nollatoleranssi
            sexual: 0.7,              // Salliva
            violence: 0.9,            // Salliva
            'violence/graphic': 0.8,  // Salliva
            harassment: 0.95          // Salliva
          };
          break;
        default: // 'normal'
          THRESHOLDS = {
            'sexual/minors': 0.00001,
            sexual: 0.4,              // Kohtuullinen
            violence: 0.8,            // Kohtuullinen
            'violence/graphic': 0.6,  // Kohtuullinen
            harassment: 0.9           // Kohtuullinen
          };
      }
      
      console.log(`🎛️ Moderation level: ${moderationLevel}`, THRESHOLDS);

      // 🧪 DEBUG MODE: Aseta ympäristömuuttuja VITE_DEBUG_MODERATION=true testaamista varten
      const isDebugMode = import.meta.env.VITE_DEBUG_MODERATION === 'true';
      if (isDebugMode) {
        console.log('🧪 DEBUG MODE: Moderointi asetettu tiukaksi testaamista varten');
        // Testaa bannijärjestelmää käyttämällä matalampaa kynnystä
        if (scores['sexual'] > 0.01 || scores['violence'] > 0.01) {
          console.log('🧪 DEBUG: Testataan bannia matalalla kynnyksellä');
          return {
            flagged: true,
            categories: ['debug_test'],
            scores
          };
        }
      }

      // 1) Estä aina alaikäisiin liittyvä seksi
      const minorsScore = scores['sexual/minors'] || 0;
      if (categories['sexual/minors'] || minorsScore > THRESHOLDS['sexual/minors']) {
        console.log('🚫 Estetty: sexual/minors (nollatoleranssi)');
        return {
          flagged: true,
          categories: ['sexual/minors'],
          scores
        };
      }

      // 2) Arvioi muut kategoriat lievemmillä rajoilla
      const blocked = [];
      if ((scores['sexual'] || 0) > THRESHOLDS['sexual']) blocked.push('sexual');
      if ((scores['violence'] || 0) > THRESHOLDS['violence']) blocked.push('violence');
      if ((scores['violence/graphic'] || 0) > THRESHOLDS['violence/graphic']) blocked.push('violence/graphic');
      if ((scores['harassment'] || 0) > THRESHOLDS['harassment']) blocked.push('harassment');

      // 3) Jos OpenAI flaggaa mutta pisteet ovat selvästi alle rajojen, sallitaan (paitsi minors)
      if (blocked.length === 0) {
        console.log('✅ Kuva hyväksytty (rajat alitettu).');
        return { flagged: false };
      }

      console.log('🚫 Kuva estetty lievennetyilläkin rajoilla:', blocked);
      return {
        flagged: true,
        categories: blocked,
        scores
      };
      
    } catch (error) {
      console.error('❌ Kuvan moderointi epäonnistui:', error);
      
      // Turvallisuuden vuoksi: jos moderation epäonnistuu, estä kuva
      throw new Error(`Kuvan moderointi epäonnistui: ${error.message}. Yritä uudelleen.`);
    }
  }, []);

  // Kuvan upload käsittely
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Tarkista onko käyttäjä bannattu
    if (userBanStatus?.banned) {
      if (userBanStatus.permanent) {
        alert('🚫 Sinut on bannattu pysyvästi. Et voi lähettää kuvia.');
      } else {
        const timeLeft = userBanStatus.endsAt ? new Date(userBanStatus.endsAt).toLocaleString() : 'tuntematon';
        alert(`⏰ Sinut on bannattu väliaikaisesti.\nBanni päättyy: ${timeLeft}\nSyy: ${userBanStatus.reason}`);
      }
      return;
    }

    // Tarkista että käyttäjä on 18+ (Google-käyttäjyys ei pakollinen, mutta suositeltava)
    if (!profile?.age || profile.age < 18) {
      alert('🚫 Vain 18+ vuotiaat voivat lähettää kuvia.');
      return;
    }

    // Varoita jos ei Google-käyttäjä, mutta salli silti
    if (!user?.isGoogleUser) {
      const confirmUpload = confirm('⚠️ Suosittelemme Google-tiliä kuvapalveluun.\n\nJatka kuitenkin kuvan lähetystä?');
      if (!confirmUpload) {
        return;
      }
    }

    // Tarkista tiedostotyyppi
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('🚫 Sallitut kuvaformaatit: JPG, PNG, GIF, WEBP');
      return;
    }

    // Tarkista tiedostokoko (32MB max)
    const maxSize = 32 * 1024 * 1024; // 32MB bytes
    if (file.size > maxSize) {
      alert('🚫 Kuva on liian suuri. Maksimikoko: 32MB');
      return;
    }

    if (!roomReady) {
      alert('⏳ Odota toista käyttäjää ennen kuvan lähettämistä');
      return;
    }

    setImageUploading(true);
    setUploadProgress('Tarkistetaan tiedostoa...');

    try {
    // 1. Lataa kuva ImgBB:hen (24h auto-poisto)
    setUploadProgress('Ladataan kuvaa palvelimelle...');
    
    try {
      const imageData = await uploadImageToImgBB(file);
      console.log('✅ Kuva ladattu ImgBB:hen:', imageData);

      // 2. Moderoi kuva OpenAI:lla
      setUploadProgress('Tarkistetaan kuvan sisältöä...');
      const moderationResult = await moderateImage(imageData.url);
      
      if (moderationResult.flagged) {
        // Sopimaton kuva → välitön 24h banni (tai ikuinen jos 3. banni)
        await handleInappropriateContent(
          user.uid, 
          BAN_REASONS.INAPPROPRIATE_IMAGE, 
          roomId, 
          { 
            imageUrl: imageData.url,
            reason: moderationResult.categories?.join(', ') || 'Sopimaton sisältö',
            moderationType: 'openai_image',
            scores: moderationResult.scores
          }
        );
        return;
      }

      // 3. Lähetä kuvaviesti chatiin (turvallisesti tallennettu)
      setUploadProgress('Lähetetään kuvaa chatiin...');
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
        text: '', // Tyhjä teksti kuvaviestille
        imageUrl: imageData.url,
        imageDeleteUrl: imageData.deleteUrl,
        imageExpiration: imageData.expiration,
        type: 'image',
        senderId: user.uid,
        senderName: profile?.nickname || user.displayName || 'Tuntematon',
        senderAge: profile?.age || 'Ei määritelty',
        timestamp: serverTimestamp(),
        moderationChecked: true, // Kuva on jo moderoitu
        isPrivate: true // Merkitse yksityiseksi chat-kuvaksi
      });

      console.log('✅ Kuvaviesti lähetetty');
      scrollToBottom();
      
    } catch (uploadError) {
      console.error('❌ Kuvan upload/moderointi epäonnistui:', uploadError);
      
      // Tarkista onko API-avain puuttuu
      if (uploadError.message?.includes('API-avain puuttuu')) {
        alert('❌ Kuvien lähetys ei ole käytössä: ImgBB API-avain puuttuu.\n\nOta yhteyttä ylläpitoon.');
      } else if (uploadError.message?.includes('ImgBB API virhe')) {
        alert('❌ Kuvan lataus epäonnistui palvelimelle.\n\nYritä uudelleen hetken päästä.');
      } else if (uploadError.message?.includes('moderation')) {
        alert('❌ Kuvan sisällön tarkistus epäonnistui.\n\nYritä uudelleen.');
      } else {
        alert('❌ Kuvan lähetys epäonnistui.\n\nTarkista internetyhteytesi ja yritä uudelleen.');
      }
      
      throw uploadError; // Siirry catch-lohkoon
    }

    } catch (error) {
      console.error('❌ Kuvan lähetys epäonnistui:', error);
      
      // Virheilmoitus on jo näytetty upload-lohkossa, ei tuplaa
      if (!error.message?.includes('API-avain puuttuu') && 
          !error.message?.includes('ImgBB API virhe') && 
          !error.message?.includes('moderation')) {
        alert('❌ Kuvan lähetys epäonnistui. Yritä uudelleen.');
      }
    } finally {
      setImageUploading(false);
      setUploadProgress('');
      // Tyhjennä file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [roomReady, roomId, user, profile, uploadImageToImgBB, moderateImage, scrollToBottom, userBanStatus]);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    // Tarkista onko käyttäjä bannattu
    if (userBanStatus?.banned) {
      if (userBanStatus.permanent) {
        alert('🚫 Sinut on bannattu pysyvästi. Et voi lähettää viestejä.');
      } else {
        const timeLeft = userBanStatus.endsAt ? new Date(userBanStatus.endsAt).toLocaleString() : 'tuntematon';
        alert(`⏰ Sinut on bannattu väliaikaisesti.\nBanni päättyy: ${timeLeft}\nSyy: ${userBanStatus.reason}`);
      }
      return;
    }
    
    const messageText = newMessage.trim();
    if (!messageText || !roomReady) {
      console.log("Ei voida lähettää viestiä:", { hasMessage: !!messageText, roomReady });
      return;
    }

    try {
      // HYBRIDIMALLI: Offline (suomi) + OpenAI (englanti + konteksti)
      console.log("Moderoidaan viesti hybridimallilla:", messageText);
      
      // 1. OFFLINE MODEROINTI (suomalaiset sanat)
      const offlineResult = await smartModerationService.moderateMessage(messageText, user.uid);
      console.log("📱 Offline moderation tulos:", offlineResult);
      
      if (offlineResult.isBlocked) {
        // Käsittele sopimaton sisältö bannijärjestelmän kautta
        await handleInappropriateContent(
          user.uid, 
          BAN_REASONS.INAPPROPRIATE_TEXT, 
          roomId, 
          { 
            message: messageText,
            reason: offlineResult.warningMessage || 'Sopimaton sisältö',
            moderationType: 'offline'
          }
        );
        setNewMessage('');
        return;
      }
      
      // 2. OPENAI API (englanti + konteksti)
      try {
        const openAIResponse = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            input: newMessage.trim(),
            model: 'omni-moderation-latest'
          })
        });
        
        const moderationData = await openAIResponse.json();
        console.log('🤖 OpenAI Moderation vastaus:', moderationData);
        
        if (moderationData.results && moderationData.results[0]) {
          const result = moderationData.results[0];
          console.log('📊 Kategoriat:', result.categories);
          console.log('📈 Pisteet:', result.category_scores);
          
          // TIUKENNETUT KRITEERIT - estää myös lievemmät tapaukset
          const scores = result.category_scores;
          let blocked = false;
          let reason = [];
          
          // Tarkista kriittiset kategoriat kohtuullisilla rajoilla
          const categories = [
            { name: 'seksuaalinen sisältö', key: 'sexual', threshold: 0.25 },       // 25% (oli 15%)
            { name: 'häirintä', key: 'harassment', threshold: 0.08 },               // 8% (oli 5%)
            { name: 'väkivalta', key: 'violence', threshold: 0.08 },                // 8% (oli 5%)
            { name: 'viha', key: 'hate', threshold: 0.05 },                         // 5% (oli 2%)
            { name: 'uhkaava häirintä', key: 'harassment/threatening', threshold: 0.01 }, // 1% (oli 0.5%)
            { name: 'uhkaava väkivalta', key: 'violence/graphic', threshold: 0.01 }  // 1% (oli 0.5%)
          ];          categories.forEach(category => {
            const score = scores[category.key] || 0;
            if (score > category.threshold) {
              blocked = true;
              reason.push(`${category.name} (${(score * 100).toFixed(1)}% > ${(category.threshold * 100).toFixed(1)}%)`);
            }
          });
          
          console.log('🔍 Korkeimmat pisteet:', Object.entries(scores)
            .filter(([key, value]) => value > 0.01)
            .map(([key, value]) => `${key}: ${(value * 100).toFixed(1)}%`)
            .join(', '));
          
          // Jos ylittää jonkin rajan tai alkuperäinen flagged
          if (blocked || result.flagged) {
            if (result.flagged && reason.length === 0) {
              // Jos OpenAI flaggasi mutta ei yksikään meidän raja
              const flaggedCategories = Object.keys(result.categories).filter(key => result.categories[key]);
              reason = flaggedCategories;
            }
            
            // Käsittele sopimaton sisältö bannijärjestelmän kautta
            await handleInappropriateContent(
              user.uid, 
              BAN_REASONS.INAPPROPRIATE_TEXT, 
              roomId, 
              { 
                message: messageText,
                reason: reason.join(', '),
                moderationType: 'openai',
                scores: scores
              }
            );
            setNewMessage('');
            return;
          }
          
          console.log('✅ OpenAI: Viesti hyväksytty kaikissa kategorioissa');
        }
      } catch (apiError) {
        console.error('❌ OpenAI API virhe, käytetään vain offline-moderointia:', apiError);
      }
      
      // Jos offline antoi varoituksen mutta ei estänyt
      if (offlineResult.isHarmful && offlineResult.warningMessage) {
        alert(offlineResult.warningMessage);
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
      
      // Nollaa typing-status viestin lähettämisen jälkeen
      setIsTyping(false);
      if (roomId && user?.uid) {
        const roomRef = doc(db, 'rooms', roomId);
        updateDoc(roomRef, {
          [`typingUsers.${user.uid}`]: false
        }).catch(error => {
          console.error("❌ Virhe typing-statuksen päivityksessä:", error);
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
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
        
        // Nollaa typing-status fallback-tapauksessakin
        setIsTyping(false);
        if (roomId && user?.uid) {
          const roomRef = doc(db, 'rooms', roomId);
          updateDoc(roomRef, {
            [`typingUsers.${user.uid}`]: false
          }).catch(error => {
            console.error("❌ Virhe typing-statuksen päivityksessä:", error);
          });
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    }
  }, [newMessage, roomReady, user.uid, profile.displayName, roomId, userBanStatus]); // Lisätty userBanStatus

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

  // Taustamusiikki ja ääniefektit
  useEffect(() => {
    if (playMusic && backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = 0.15;
      backgroundMusicRef.current.play().catch(error => {
        console.log("Automaattinen musiikki estetty selaimessa:", error);
      });
    } else if (!playMusic && backgroundMusicRef.current) {
      // Pysäytä musiikki jos asetus on pois päältä
      backgroundMusicRef.current.pause();
    }
    
    // Yhdistymisääni kun huone on valmis (vain jos musiikki on päällä)
    if (roomReady && playMusic && joinSoundRef.current) {
      joinSoundRef.current.volume = 0.3;
      joinSoundRef.current.play().catch(error => {
        console.log("Yhdistymisääni estetty selaimessa:", error);
      });
    }
    
    // Cleanup: pysäytä musiikki kun komponentti poistetaan
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, [roomReady, playMusic]); // Lisätty playMusic riippuvuudeksi

  // Cleanup typing-indikaattori komponenttia poistettaessa
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Nollaa typing-status kun komponentti poistuu
      if (roomId && user?.uid && roomActiveRef.current) {
        const roomRef = doc(db, 'rooms', roomId);
        updateDoc(roomRef, {
          [`typingUsers.${user.uid}`]: false
        }).catch(error => {
          console.error("❌ Virhe typing-statuksen päivityksessä:", error);
        });
      }
    };
  }, [roomId, user?.uid]); // Poistettu updateTypingStatus

  // Nopea, luotettavampi huoneen sulku (käytetään kun sivu piilotetaan/poistutaan)
  const fastCloseRoom = useCallback(async (reason = 'auto') => {
    if (!roomId || !user?.uid) return;
    if (hasFastLeftRef.current) return; // Estä tuplasuoritukset
    hasFastLeftRef.current = true;
    roomActiveRef.current = false;

    try {
      // Lähetä yksinkertainen järjestelmäviesti (parhaamme mukaan)
      const leaveMsgId = 'leave_' + Date.now();
      const leaveMessage = {
        id: leaveMsgId,
        senderId: 'system',
        senderName: 'Järjestelmä',
        text: `${user.displayName || 'Käyttäjä'} poistui chatista. Chat on päättynyt.`,
        timestamp: serverTimestamp(),
        type: 'system',
      };
      try {
        await setDoc(doc(db, 'rooms', roomId, 'messages', leaveMessage.id), leaveMessage);
      } catch (e) {
        // Hiljainen epäonnistuminen (esim. unload)
      }

      // Merkitse huone epäaktiiviseksi – CleanupService poistaa myöhemmin
      await updateDoc(doc(db, 'rooms', roomId), {
        isActive: false,
        leftAt: serverTimestamp(),
        closedBy: user.uid,
        closedReason: reason,
        [`typingUsers.${user.uid}`]: false
      });
    } catch (e) {
      // Hiljainen epäonnistuminen
    } finally {
      // Yritä poistua UI:sta joka tapauksessa
      onLeaveRoom();
    }
  }, [roomId, user?.uid, user?.displayName, onLeaveRoom]);

  // Sulje huone automaattisesti kun sivu piilotetaan/poistutaan VAIN PITKÄN VIIVEEN JÄLKEEN
  useEffect(() => {
    if (!roomId || !user?.uid) return;

    let visibilityTimer = null;
    let isPageHiding = false;

    const onVisibilityChange = () => {
      if (document.hidden) {
        // Kun sivu piilotetaan, aseta 60 sekunnin timer
        isPageHiding = true;
        console.log('👁️ Sivu piilotettu, asetetaan 60s timer...');
        
        visibilityTimer = setTimeout(() => {
          if (isPageHiding && document.hidden) {
            console.log('⏰ 60 sekuntia kulunut piiloitettuna, suljetaan huone');
            fastCloseRoom('visibilitychange-timeout');
          }
        }, 60000); // 60 sekuntia
      } else {
        // Kun sivu tulee takaisin näkyviin, peruuta timer
        isPageHiding = false;
        if (visibilityTimer) {
          console.log('👁️ Sivu tuli takaisin näkyviin, peruutetaan timer');
          clearTimeout(visibilityTimer);
          visibilityTimer = null;
        }
      }
    };

    const onPageHide = () => {
      // pagehide on lopullinen - sulje heti
      fastCloseRoom('pagehide');
    };
    
    const onBeforeUnload = () => {
      // beforeunload - sulje heti
      fastCloseRoom('beforeunload');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      isPageHiding = false;
      if (visibilityTimer) {
        clearTimeout(visibilityTimer);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [roomId, user?.uid, fastCloseRoom]);

  // Ilmoita käyttäjä (porrastettu bänni: 4 ilmoitusta = temp bänni, 3 temp bänniä = ikuinen)
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
      const reportersList = currentProfile.reportersList || [];
      
      // Tarkista onko tämä käyttäjä jo ilmoittanut
      if (reportersList.includes(user.uid)) {
        console.log("Käyttäjä on jo ilmoittanut tästä henkilöstä");
        setShowReportMenu(false);
        return;
      }
      
      const banHistory = currentProfile.banHistory || [];
      
      // Tarkista onko jo ikuisesti bannattu
      if (currentProfile.banned) {
        console.log("Käyttäjä on jo bannattu ikuisesti");
        setShowReportMenu(false);
        return;
      }
      
      // Lisää tämä käyttäjä ilmoittajien listaan
      const newReportersList = [...reportersList, user.uid];
      const newReportCount = newReportersList.length;
      
      let updateData = {
        reportersList: newReportersList,
        reports: newReportCount,
        lastReported: new Date()
      };
      
      let shouldLeave = false;
      
      // Jos 4+ ilmoitusta, anna bänni
      if (newReportCount >= 4) {
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
          updateData.reportersList = []; // Nollaa ilmoittajat temp-bännin jälkeen
          updateData.reports = 0; // Nollaa ilmoitukset temp-bännin jälkeen
          
          shouldLeave = true;
        }
      }
      
      // Päivitä profiili
      await updateDoc(profileRef, updateData);
      console.log(`✅ Käyttäjä ilmoitettu (${newReportCount}/4 ilmoitusta)`);
      
      // Ei ilmoitusta käyttäjälle - hiljainen toiminto
      setShowReportMenu(false);
      
      if (shouldLeave) {
        // Poistu huoneesta automaattisesti
        leaveRoom();
      }
      
    } catch (error) {
      console.error('❌ Virhe käyttäjän ilmoittamisessa:', error);
      setShowReportMenu(false);
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
      
      // Poista kaikki viestit ja niihin liittyvät kuvat ennen huoneen poistamista - NOPEA BATCH-VERSIO
      try {
        const msgsSnap = await getDocs(collection(db, 'rooms', roomId, 'messages'));
        
        if (msgsSnap.docs.length > 0) {
          console.log(`🗑️ Poistetaan ${msgsSnap.docs.length} viestiä ja niihin liittyvät kuvat (jos on)...`);
          
          // Poista ensin mahdolliset Storage-kuvat ja vanhat ImgBB-kuvat
          for (const msgDoc of msgsSnap.docs) {
            const data = msgDoc.data();
            if (data?.imagePath) {
              try {
                const fileRef = ref(storage, data.imagePath);
                await deleteObject(fileRef);
                console.log(`🗑️ Poistettu Storage-kuva: ${data.imagePath}`);
              } catch (fileErr) {
                // Jos bucket puuttuu, ohitetaan siivous hiljaisesti
                if ((fileErr?.code || '').includes('no-default-bucket')) {
                  console.warn('ℹ️ Storage bucket puuttuu, ohitetaan Storage-kuvien poisto.');
                } else {
                  console.warn(`⚠️ Kuvan poisto epäonnistui (${data.imagePath}):`, fileErr?.message || fileErr);
                }
              }
            }
            // Poista myös vanhat ImgBB-kuvat jos deleteUrl tallessa
            if (data?.imageDeleteUrl) {
              try {
                await fetch(data.imageDeleteUrl, { method: 'GET', mode: 'no-cors' });
                console.log('🗑️ Pyyntö lähetetty ImgBB-kuvan poistoon');
              } catch (imgbbErr) {
                console.warn('⚠️ ImgBB-kuvan poisto epäonnistui:', imgbbErr?.message || imgbbErr);
              }
            }
          }
          
          // Firestore batch voi poistaa max 500 dokumenttia kerralla
          const batchSize = 500;
          const docs = msgsSnap.docs;
          
          for (let i = 0; i < docs.length; i += batchSize) {
            const batch = writeBatch(db);
            const batchDocs = docs.slice(i, i + batchSize);
            
            batchDocs.forEach(msgDoc => {
              batch.delete(doc(db, 'rooms', roomId, 'messages', msgDoc.id));
            });
            
            await batch.commit();
            console.log(`✅ Poistettu batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(docs.length/batchSize)}`);
          }
          
          console.log('🧹 Kaikki viestit siivottu nopeasti!');
        }
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
      {/* Audio-elementit */}
      <audio ref={backgroundMusicRef} loop>
        <source src="/meditation-relaxing-music-293922.mp3" type="audio/mpeg" />
        Selaimesi ei tue ääntä.
      </audio>
      
      <audio ref={joinSoundRef}>
        <source src="/join.wav" type="audio/wav" />
        Selaimesi ei tue ääntä.
      </audio>
      
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
        {otherUserTyping && (
          <div className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span style={{marginLeft: 8}}>Keskustelukumppani kirjoittaa...</span>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <p>Aloita keskustelu tervehtimällä!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            if (!message || (!message.text && !message.imageUrl)) return null;
            
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
                    {/* Tekstiviesti */}
                    {message.text && (
                      <div className="message-text">
                        {message.text}
                      </div>
                    )}
                    
                    {/* Kuvaviesti */}
                    {message.imageUrl && (
                      <div className="message-image">
                        <img 
                          src={message.imageUrl} 
                          alt="Jaettu kuva" 
                          className="chat-image"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="image-error" style={{ display: 'none' }}>
                          🖼️ Kuva ei latautunut
                        </div>
                      </div>
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
          <textarea
            value={newMessage}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onInput={(e) => {
              // ChatGPT-tyylinen auto-resize
              const el = e.target;
              const prevHeight = el.offsetHeight;
              
              el.style.height = 'auto';
              const newHeight = Math.min(el.scrollHeight, 150);
              el.style.height = newHeight + 'px';
              
              // Jos korkeus muuttui, säädä vieritys
              const heightDiff = newHeight - prevHeight;
              if (heightDiff !== 0) {
                // Säädä vieritys siten että textarea pysyy näkyvissä
                const messagesContainer = document.querySelector('.chat-messages');
                if (messagesContainer) {
                  messagesContainer.scrollTop += heightDiff;
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Trigger send on Enter (Shift+Enter = newline)
                sendMessage({ preventDefault: () => {} });
              }
            }}
            placeholder={
              userBanStatus?.banned 
                ? (userBanStatus.permanent ? "Sinut on bannattu pysyvästi" : `Bannattu - päättyy ${userBanStatus.endsAt?.toLocaleString()}`)
                : (roomReady ? "Kirjoita viesti..." : "Odotetaan toista käyttäjää...")
            }
            className="chat-input"
            rows={1}
            maxLength={500}
            autoComplete="off"
            disabled={!roomReady || userBanStatus?.banned}
            inputMode="text"
            enterKeyHint="send"
            style={{ resize: 'none' }}
          />
          
          {/* Kuva-upload painike */}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            ref={fileInputRef}
            id="image-upload"
          />
          <label 
            htmlFor="image-upload" 
            className={`chat-image-btn ${imageUploading ? 'image-uploading' : ''}`}
            onClick={() => {
              console.log("🖱️ Image button clicked - checking conditions:");
              console.log("  - roomReady:", roomReady);
              console.log("  - imageUploading:", imageUploading);
              console.log("  - userBanned:", userBanStatus?.banned);
              console.log("  - imgbbKey:", !!import.meta.env.VITE_IMGBB_API_KEY);
              console.log("  - profileAge:", profile?.age);
              console.log("  - isOver18:", profile?.age >= 18);
              const disabled = (!roomReady || imageUploading || userBanStatus?.banned || !profile?.age || profile.age < 18);
              console.log("  - shouldBeDisabled:", disabled);
              if (disabled) {
                console.log("❌ Button should be disabled!");
              } else {
                console.log("✅ Button should work!");
              }
            }}
            style={{ 
              pointerEvents: (!roomReady || imageUploading || userBanStatus?.banned || !profile?.age || profile.age < 18) ? 'none' : 'auto',
              opacity: (!roomReady || imageUploading || userBanStatus?.banned || !profile?.age || profile.age < 18) ? 0.6 : 1 
            }}
            title={
              userBanStatus?.banned 
                ? "Et voi lähettää kuvia (bannattu)"
                : ((!profile?.age || profile.age < 18)
                    ? "Kuvan lähetys vain 18+ käyttäjille"
                    : (!roomReady 
                        ? `Huone ei valmis (roomReady: ${roomReady})`
                        : (imageUploading ? uploadProgress || "Lähettää kuvaa..." : "Lähetä kuva")))
            }
          >
            {imageUploading ? (
              <>
                ⏳
                <div className="upload-spinner"></div>
              </>
            ) : (
              '📷'
            )}
          </label>
          
          {/* Progress-teksti kuvan latauksen aikana */}
          {imageUploading && uploadProgress && (
            <div className="upload-progress-text">
              {uploadProgress}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={!newMessage.trim() || !roomReady || userBanStatus?.banned}
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