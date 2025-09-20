// Yksinkertainen bannijärjestelmä - tallentaa vain users-kokoelmaan
import { 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from '../firebase';

// Bannien herkkyysasetukset
const getBanSettings = () => {
  const sensitivity = import.meta?.env?.VITE_BAN_SENSITIVITY || 'normal';
  
  switch (sensitivity) {
    case 'strict':
      return {
        textViolationsForBan: 3,
        tempBanDuration: 48,
        permBanAfter: 2
      };
    case 'relaxed':
      return {
        textViolationsForBan: 10,
        tempBanDuration: 12,
        permBanAfter: 5
      };
    default:
      return {
        textViolationsForBan: 5,
        tempBanDuration: 24,
        permBanAfter: 3
      };
  }
};

// Banni-syyt
const BAN_REASONS = {
  INAPPROPRIATE_TEXT: 'inappropriate_text',
  INAPPROPRIATE_IMAGE: 'inappropriate_image',
  SPAM: 'spam',
  PERMANENT: 'permanent_ban'
};

// Muunna Google ID puhtaaksi
const getUserDocId = (userId) => {
  if (userId && userId.startsWith('google-')) {
    return userId.replace('google-', '');
  }
  return userId;
};

// Yksinkertainen rikkomuksen tallennus users-kokoelmaan
export const recordViolation = async (userId, type, details = {}) => {
  try {
    const docId = getUserDocId(userId);
    
    // Hae tai luo käyttäjän tiedot
    const userRef = doc(db, 'users', docId);
    const userSnap = await getDoc(userRef);
    
    let userData = {};
    if (userSnap.exists()) {
      userData = userSnap.data();
    }

    // Lisää rikkomus käyttäjän tietoihin
    const violations = userData.violations || [];
    violations.push({
      type,
      details,
      timestamp: new Date(),
      originalUserId: userId
    });

    // Päivitä käyttäjätiedot
    await setDoc(userRef, {
      ...userData,
      violations,
      lastViolation: new Date(),
      violationCount: violations.length
    }, { merge: true });

    console.log(`📋 Rikkomus tallennettu users/${docId}: ${type}`);
    return docId;
    
  } catch (error) {
    console.error('❌ Virhe rikkomuksen tallennuksessa:', error);
    throw error;
  }
};

// Hae käyttäjän viimeaikaiset tekstirikkeet (24h sisällä)
export const getRecentTextViolations = async (userId) => {
  try {
    const docId = getUserDocId(userId);
    const userRef = doc(db, 'users', docId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return 0;
    
    const userData = userSnap.data();
    const violations = userData.violations || [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return violations.filter(v => 
      v.type === BAN_REASONS.INAPPROPRIATE_TEXT && 
      new Date(v.timestamp) > oneDayAgo
    ).length;
    
  } catch (error) {
    console.error('❌ Virhe tekstirikkeiden haussa:', error);
    return 0;
  }
};

// Tarkista onko käyttäjä bannattu
export const isUserBanned = async (userId) => {
  try {
    const docId = getUserDocId(userId);
    const userDoc = await getDoc(doc(db, 'users', docId));
    
    if (!userDoc.exists()) {
      return { banned: false };
    }

    const userData = userDoc.data();
    const bannedUntil = userData.bannedUntil;

    // Jos ei bannia
    if (!bannedUntil) {
      return { banned: false };
    }

    // Jos ikuinen banni
    if (bannedUntil === 'permanent') {
      return { 
        banned: true, 
        permanent: true,
        reason: userData.banReason || 'Ikuinen banni',
        email: userData.email
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
        reason: userData.banReason || 'Määräaikainen banni',
        email: userData.email
      };
    } else {
      // Banni päättynyt, poista se
      await updateDoc(doc(db, 'users', docId), {
        bannedUntil: null,
        banReason: null
      });
      return { banned: false };
    }
  } catch (error) {
    console.error('❌ Virhe banni-tarkistuksessa:', error);
    return { banned: false };
  }
};

// Yksinkertainen bannaus users-kokoelmaan
export const banUser = async (userId, reason, permanent = false) => {
  try {
    const banSettings = getBanSettings();
    const docId = getUserDocId(userId);
    const userRef = doc(db, 'users', docId);
    const userSnap = await getDoc(userRef);

    let userData = {};
    if (userSnap.exists()) {
      userData = userSnap.data();
    }

    // Laske bannien määrä
    let banCount = (userData.banCount || 0) + 1;

    const banData = {
      ...userData,
      banCount,
      banReason: reason,
      lastBanDate: new Date(),
      bannedUntil: null
    };

    // Määritä bannin tyyppi
    if (banCount >= banSettings.permBanAfter || permanent) {
      banData.bannedUntil = 'permanent';
      banData.banReason = `Ikuinen banni (${banCount}. rikkomus)`;
      console.log(`🚫 IKUINEN BANNI: ${docId} (${banCount}. rikkomus)`);
    } else {
      const banDuration = banSettings.tempBanDuration * 60 * 60 * 1000;
      const banEndTime = new Date(Date.now() + banDuration);
      banData.bannedUntil = banEndTime;
      console.log(`⏰ ${banSettings.tempBanDuration}H BANNI: ${docId}, päättyy ${banEndTime.toLocaleString()}`);
    }

    // Tallenna users-kokoelmaan
    await setDoc(userRef, banData);

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

// Yksinkertainen sopimattoman sisällön käsittely
export const handleInappropriateContent = async (userId, type, roomId, details = {}) => {
  try {
    console.log(`🚨 Sopimaton sisältö: ${type} - Käyttäjä: ${userId}`);

    // Tallenna rikkomus users-kokoelmaan
    await recordViolation(userId, type, details);

    if (type === BAN_REASONS.INAPPROPRIATE_IMAGE) {
      // Kuva: välitön banni
      const banResult = await banUser(userId, 'Sopimaton kuva', false);
      return { banned: true, banResult };

    } else if (type === BAN_REASONS.INAPPROPRIATE_TEXT) {
      // Teksti: tarkista kynnys
      const banSettings = getBanSettings();
      const violationCount = await getRecentTextViolations(userId);
      
      console.log(`📊 Tekstirikkeet: ${violationCount}/${banSettings.textViolationsForBan}`);
      
      if (violationCount >= banSettings.textViolationsForBan) {
        const banResult = await banUser(userId, `${banSettings.textViolationsForBan} sopimatonta viestiä`, false);
        return { banned: true, banResult };
      } else {
        return { banned: false, violationCount };
      }
    }

  } catch (error) {
    console.error('❌ Virhe sopimattoman sisällön käsittelyssä:', error);
    throw error;
  }
};

export { BAN_REASONS };