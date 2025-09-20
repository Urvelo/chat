// Automaattinen bannijärjestelmä
import { 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  serverTimestamp 
} from '../firebase';

// Bannien herkkyysasetukset (säädettävät .env:n kautta)
const getBanSettings = () => {
  const sensitivity = import.meta?.env?.VITE_BAN_SENSITIVITY || 'normal';
  
  switch (sensitivity) {
    case 'strict':
      return {
        textViolationsForBan: 3,     // 3 tekstirikkomusta → banni
        tempBanDuration: 48,         // 48h temp-banni
        permBanAfter: 2              // 2. banni = ikuinen
      };
    case 'relaxed':
      return {
        textViolationsForBan: 10,    // 10 tekstirikkomusta → banni
        tempBanDuration: 12,         // 12h temp-banni
        permBanAfter: 5              // 5. banni = ikuinen
      };
    default: // 'normal'
      return {
        textViolationsForBan: 5,     // 5 tekstirikkomusta → banni
        tempBanDuration: 24,         // 24h temp-banni
        permBanAfter: 3              // 3. banni = ikuinen
      };
  }
};

// Bannin kestot (millisekunteina)
const BAN_DURATION = {
  TEMPORARY: 24 * 60 * 60 * 1000, // 24 tuntia (päivitetään dynaamisesti)
  PERMANENT: null // Ikuinen
};

// Banni-syyt
const BAN_REASONS = {
  INAPPROPRIATE_TEXT: 'inappropriate_text',
  INAPPROPRIATE_IMAGE: 'inappropriate_image',
  SPAM: 'spam',
  PERMANENT: 'permanent_ban'
};

// Muunna käyttäjä-ID tallennuskelpoiseksi Google ID:ksi
// Google-käyttäjille: google-xxx -> xxx (helpompi hallinta)
const getUserDocId = (userId) => {
  if (userId && userId.startsWith('google-')) {
    return userId.replace('google-', '');
  }
  return userId;
};

// Tallenna käyttäjän rikkomus
export const recordViolation = async (userId, type, details = {}) => {
  try {
    const docId = getUserDocId(userId);
    
    // Hae käyttäjän Gmail-osoite bännien hallintaa varten
    let userEmail = null;
    try {
      const userRef = doc(db, 'profiles', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userEmail = userSnap.data().email;
      }
    } catch (error) {
      console.warn('⚠️ Ei voitu hakea käyttäjän sähköpostia:', error);
    }
    
    const violation = {
      userId: docId, // Tallenna puhdas Google ID
      originalUserId: userId, // Säilytä alkuperäinen referenssiksi  
      userEmail, // Gmail helpottaa bännien hallintaa
      type, // 'inappropriate_text' tai 'inappropriate_image'
      details,
      timestamp: serverTimestamp(),
      processed: false
    };

    // Tallenna rikkomus violations-kokoelmaan
    const violationRef = await addDoc(collection(db, 'violations'), violation);
    console.log(`📋 Rikkomus tallennettu: ${type} - ${violationRef.id}`);

    return violationRef.id;
  } catch (error) {
    console.error('❌ Virhe rikkomuksen tallennuksessa:', error);
    throw error;
  }
};

// Hae käyttäjän viimeaikaiset tekstirikkeet (24h sisällä)
export const getRecentTextViolations = async (userId) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const q = query(
      collection(db, 'violations'),
      where('userId', '==', userId),
      where('type', '==', BAN_REASONS.INAPPROPRIATE_TEXT),
      where('timestamp', '>=', oneDayAgo)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('❌ Virhe tekstirikkeiden haussa:', error);
    return 0;
  }
};

// Tarkista onko käyttäjä bannattu
export const isUserBanned = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { banned: false };
    }

    const userData = userDoc.data();
    const bannedUntil = userData.bannedUntil;

    // Jos ei bannia, ok
    if (!bannedUntil) {
      return { banned: false };
    }

    // Jos ikuinen banni
    if (bannedUntil === 'permanent') {
      return { 
        banned: true, 
        permanent: true,
        reason: userData.banReason || 'Ikuinen banni'
      };
    }

    // Jos määräaikainen banni
    const banEndTime = bannedUntil.toMillis ? bannedUntil.toMillis() : bannedUntil;
    const now = Date.now();

    if (banEndTime > now) {
      return { 
        banned: true, 
        permanent: false,
        endsAt: new Date(banEndTime),
        reason: userData.banReason || 'Määräaikainen banni'
      };
    } else {
      // Banni on päättynyt, poista se (merge: true säilyttää muut kentät)
      await setDoc(doc(db, 'users', userId), {
        bannedUntil: null,
        banReason: null
      }, { merge: true });
      return { banned: false };
    }
  } catch (error) {
    console.error('❌ Virhe banni-tarkistuksessa:', error);
    return { banned: false };
  }
};

// Bannaa käyttäjä
export const banUser = async (userId, reason, permanent = false) => {
  try {
    const banSettings = getBanSettings();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    // Hae käyttäjän Gmail-osoite bännien hallintaa varten
    let userEmail = null;
    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        userEmail = profileSnap.data().email;
      }
    } catch (error) {
      console.warn('⚠️ Ei voitu hakea käyttäjän sähköpostia:', error);
    }

    let banData = {
      banReason: reason,
      lastBanDate: serverTimestamp(),
      userEmail // Gmail helpottaa bännien hallintaa
    };

    // Laske bannien määrä
    let banCount = 1;
    if (userDoc.exists()) {
      const userData = userDoc.data();
      banCount = (userData.banCount || 0) + 1;
    }

    banData.banCount = banCount;

    // Jos ylitetään ikuisen bannin kynnys tai pyydetty ikuinen banni
    if (banCount >= banSettings.permBanAfter || permanent) {
      banData.bannedUntil = 'permanent';
      banData.banReason = `Ikuinen banni (${banCount}. rikkomus)`;
      console.log(`🚫 IKUINEN BANNI: Käyttäjä ${userId} (${banCount}. rikkomus, kynnys: ${banSettings.permBanAfter})`);
    } else {
      // Määräaikainen banni (säädettävä kesto)
      const banDuration = banSettings.tempBanDuration * 60 * 60 * 1000; // tunteja millisekunteihin
      const banEndTime = new Date(Date.now() + banDuration);
      banData.bannedUntil = banEndTime;
      console.log(`⏰ ${banSettings.tempBanDuration}H BANNI: Käyttäjä ${userId} (${banCount}. rikkomus), päättyy ${banEndTime.toLocaleString()}`);
    }

    // Päivitä/luo käyttäjän tiedot (merge: true säilyttää olemassa olevat kentät)
    await setDoc(userDocRef, banData, { merge: true });

    // Tallenna banni-logi
    await addDoc(collection(db, 'ban_logs'), {
      userId,
      userEmail, // Gmail helpottaa bännien hallintaa
      reason,
      banCount,
      permanent: banData.bannedUntil === 'permanent',
      bannedUntil: banData.bannedUntil,
      timestamp: serverTimestamp()
    });

    return {
      banned: true,
      banCount,
      permanent: banData.bannedUntil === 'permanent',
      endsAt: banData.bannedUntil !== 'permanent' ? banData.bannedUntil : null
    };

  } catch (error) {
    console.error('❌ Virhe käyttäjän bannauksessa:', error);
    throw error;
  }
};

// Pääfunktio: käsittele sopimaton sisältö
export const handleInappropriateContent = async (userId, type, roomId, details = {}) => {
  try {
    console.log(`🚨 Sopimaton sisältö havaittu: ${type} - Käyttäjä: ${userId}`);

    // 1. Tallenna rikkomus
    await recordViolation(userId, type, details);

    // 2. Käsittele banni-logiikka
    if (type === BAN_REASONS.INAPPROPRIATE_IMAGE) {
      // Kuva: välitön 24h banni
      const banResult = await banUser(userId, 'Sopimaton kuva', false);
      
      // EI lähetetä viestiä chatiin - bannattu käyttäjä saa oman sivun
      
      return { banned: true, banResult };

    } else if (type === BAN_REASONS.INAPPROPRIATE_TEXT) {
      // Teksti: tarkista säädettävä kynnys
      const banSettings = getBanSettings();
      const violationCount = await getRecentTextViolations(userId);
      
      console.log(`📊 Tekstirikkeet: ${violationCount}/${banSettings.textViolationsForBan} (herkkyys: ${import.meta?.env?.VITE_BAN_SENSITIVITY || 'normal'})`);
      
      if (violationCount >= banSettings.textViolationsForBan) {
        // Kynnys ylitetty → banni
        const banResult = await banUser(userId, `${banSettings.textViolationsForBan} sopimatonta viestiä 24h sisällä`, false);
        
        // EI lähetetä viestiä chatiin - bannattu käyttäjä saa oman sivun
        
        return { banned: true, banResult };
      } else {
        // Alle kynnyksen → EI varoitusta chatissa
        
        return { banned: false, violationCount };
      }
    }

  } catch (error) {
    console.error('❌ Virhe sopimattoman sisällön käsittelyssä:', error);
    throw error;
  }
};

export { BAN_REASONS, BAN_DURATION };