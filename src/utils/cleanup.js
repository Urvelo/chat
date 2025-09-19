// Siivoustyökalut datan minimoimiseksi
import { collection, query, where, getDocs, deleteDoc, doc, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

class CleanupService {
  constructor() {
    console.log('🧹 Siivouspalvelu alustettu');
  }

  // Poista vanhat huoneet (yli 24h vanhat tai epäaktiiviset)
  async cleanupStaleRooms(maxAgeHours = 1) { // Muutettu 24h -> 1h
    try {
      console.log(`🧹 Aloitetaan vanhojen huoneiden siivous (yli ${maxAgeHours}h)`);
      
      const now = Date.now();
      const cutoffTime = now - (maxAgeHours * 60 * 60 * 1000);
      
      // Hae kaikki huoneet (ei voi tehdä timestamp-kyselyä ilman indeksiä)
      const roomsSnap = await getDocs(collection(db, 'rooms'));
      let deletedCount = 0;
      
      for (const roomDoc of roomsSnap.docs) {
        const data = roomDoc.data();
        const roomId = roomDoc.id;
        
        // Tarkista ikä tai aktiivisuus
        const roomAge = now - (data.createdAt?.toDate?.()?.getTime() || 0);
        const isStale = roomAge > cutoffTime || data.isActive === false;
        
        if (isStale) {
          console.log(`🗑️ Poistetaan vanha huone: ${roomId} (ikä: ${Math.round(roomAge / 1000 / 60)} min)`);
          
          // Poista viestit ja tiedostot
          await this.cleanupRoomData(roomId);
          
          // Poista huone
          await deleteDoc(doc(db, 'rooms', roomId));
          deletedCount++;
        }
      }
      
      console.log(`✅ Siivous valmis: ${deletedCount} huonetta poistettu`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Virhe huoneiden siivouksessa:', error);
      return 0;
    }
  }

  // Poista huoneen viestit ja tiedostot
  async cleanupRoomData(roomId) {
    try {
      // Hae ja poista viestit
      const msgsSnap = await getDocs(collection(db, 'rooms', roomId, 'messages'));
      
      for (const msgDoc of msgsSnap.docs) {
        // Poista viesti
        await deleteDoc(doc(db, 'rooms', roomId, 'messages', msgDoc.id));
      }
      
    } catch (error) {
      console.error(`❌ Virhe huoneen ${roomId} datan siivouksessa:`, error);
    }
  }

  // Poista vanhat waiting-käyttäjät (yli 1h odottaneet)
  async cleanupStaleWaitingUsers(maxAgeHours = 0.1) { // Muutettu 1h -> 6min (0.1h)
    try {
      console.log(`🧹 Siivotaan vanhoja waiting-käyttäjiä (yli ${maxAgeHours}h)`);
      
      const now = Date.now();
      const cutoffTime = now - (maxAgeHours * 60 * 60 * 1000);
      
      const waitingSnap = await getDocs(collection(db, 'waiting'));
      let deletedCount = 0;
      
      for (const waitingDoc of waitingSnap.docs) {
        const data = waitingDoc.data();
        const age = now - (data.timestamp || 0);
        
        if (age > cutoffTime) {
          console.log(`🗑️ Poistetaan vanha waiting-käyttäjä: ${waitingDoc.id}`);
          await deleteDoc(doc(db, 'waiting', waitingDoc.id));
          deletedCount++;
        }
      }
      
      console.log(`✅ Waiting-siivous valmis: ${deletedCount} käyttäjää poistettu`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Virhe waiting-käyttäjien siivouksessa:', error);
      return 0;
    }
  }

  // Minimoi profiilidata - poista turhat kentät
  async minimizeProfiles() {
    try {
      console.log('🧹 Minimoidaan profiilitietoja');
      
      const profilesSnap = await getDocs(collection(db, 'profiles'));
      let cleanedCount = 0;
      
      for (const profileDoc of profilesSnap.docs) {
        const data = profileDoc.data();
        const profileId = profileDoc.id;
        
        // Pidä vain tarpeelliset kentät
        const essentialData = {
          uid: data.uid,
          displayName: data.displayName,
          ageGroup: data.ageGroup,
          createdAt: data.createdAt,
          lastActive: new Date(), // Päivitä viimeinen aktiivisuus
          // Pidä moderointi/banni-tiedot
          ...(data.reports && { reports: data.reports }),
          ...(data.banned && { banned: data.banned, bannedAt: data.bannedAt, bannedReason: data.bannedReason })
        };
        
        // Tarkista onko dataa karsittavaa
        const hasExtraFields = Object.keys(data).some(key => !(key in essentialData));
        
        if (hasExtraFields) {
          console.log(`🗑️ Minimoidaan profiili: ${profileId}`);
          await setDoc(doc(db, 'profiles', profileId), essentialData);
          cleanedCount++;
        }
      }
      
      console.log(`✅ Profiilien minimointi valmis: ${cleanedCount} profiilia siivottu`);
      return cleanedCount;
      
    } catch (error) {
      console.error('❌ Virhe profiilien minimoinnissa:', error);
      return 0;
    }
  }

  // Suorita täydellinen siivous
  async performFullCleanup() {
    console.log('🧹 Aloitetaan täydellinen siivous...');
    
    const results = {
      staleRooms: await this.cleanupStaleRooms(1), // 1h sen sijaan että 24h
      staleWaiting: await this.cleanupStaleWaitingUsers(0.1), // 6min sen sijaan että 1h
      minimizedProfiles: await this.minimizeProfiles(),
      timestamp: new Date()
    };
    
    // Tallenna siivousraportti (valinnainen)
    try {
      await addDoc(collection(db, 'cleanup-logs'), {
        ...results,
        timestamp: serverTimestamp()
      });
    } catch (logError) {
      console.warn('⚠️ Siivousraportin tallennus epäonnistui:', logError);
    }
    
    console.log('✅ Täydellinen siivous valmis:', results);
    return results;
  }
}

// Luo globaali instanssi
const cleanupService = new CleanupService();

export { cleanupService };
export default CleanupService;