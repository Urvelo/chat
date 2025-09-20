// Yksinkertainen siivouspalvelu vain rooms-kokoelmalle
// Poistaa vanhat keskustelut (yli 2 päivää) ja tyhjät huoneet
import { 
  db, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch,
  updateDoc
} from '../firebase';

class CleanupService {
  
  // Poista vanhat tallennetut keskustelut (yli 2 päivää)
  async cleanupOldConversations() {
    try {
      console.log('🧹 Siivotaan vanhoja keskusteluja (yli 2 päivää)');
      
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const roomsSnap = await getDocs(collection(db, 'rooms'));
      let deletedCount = 0;
      
      for (const roomDoc of roomsSnap.docs) {
        const data = roomDoc.data();
        
        // Tarkista onko tallennettu keskustelu joka on yli 2 päivää vanha
        if (roomDoc.id.startsWith('saved_') && data.expiresAt) {
          const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          
          if (expiresAt < new Date()) {
            console.log(`🗑️ Poistetaan vanhentunut keskustelu: ${roomDoc.id}`);
            await deleteDoc(doc(db, 'rooms', roomDoc.id));
            deletedCount++;
          }
        }
        
        // Poista myös tyhjät tai vanhat aktiiviset huoneet
        if (!roomDoc.id.startsWith('saved_') && data.isActive === false) {
          const leftAt = data.leftAt?.toDate ? data.leftAt.toDate() : new Date(data.leftAt || 0);
          
          if (leftAt < twoDaysAgo) {
            console.log(`🗑️ Poistetaan vanha epäaktiivinen huone: ${roomDoc.id}`);
            
            // Optimoitu: viestit ovat nyt room-dokumentissa, ei alkokoelmassa
            await deleteDoc(doc(db, 'rooms', roomDoc.id));
            deletedCount++;
          }
        }
      }
      
      console.log(`✅ Keskustelujen siivous valmis: ${deletedCount} poistettu`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Virhe keskustelujen siivouksessa:', error);
      return 0;
    }
  }

  // Poista vanhat waiting-listaukset (yli 1 tunti)
  async cleanupOldWaiting() {
    try {
      console.log('🧹 Siivotaan vanhoja waiting-listauksia');
      
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const waitingSnap = await getDocs(collection(db, 'waiting'));
      let deletedCount = 0;
      
      for (const waitingDoc of waitingSnap.docs) {
        const data = waitingDoc.data();
        
        if (data.timestamp < oneHourAgo) {
          console.log(`🗑️ Poistetaan vanha waiting-listaus: ${waitingDoc.id}`);
          await deleteDoc(doc(db, 'waiting', waitingDoc.id));
          deletedCount++;
        }
      }
      
      console.log(`✅ Waiting-siivous valmis: ${deletedCount} poistettu`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Virhe waiting-siivous:', error);
      return 0;
    }
  }

  // Päivitä käyttäjien viimeinen aktiivisuus
  async updateUserActivity() {
    try {
      console.log('🔄 Päivitetään käyttäjien aktiivisuutta');
      
      // Yksinkertainen: merkitse kaikki käyttäjät joilla ei ole lastActive-kenttää
      const usersSnap = await getDocs(collection(db, 'users'));
      let updatedCount = 0;
      
      for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        
        if (!data.lastActive) {
          await updateDoc(doc(db, 'users', userDoc.id), {
            lastActive: new Date()
          });
          updatedCount++;
        }
      }
      
      console.log(`✅ Käyttäjäaktiivisuus päivitetty: ${updatedCount} käyttäjää`);
      return updatedCount;
      
    } catch (error) {
      console.error('❌ Virhe käyttäjäaktiivisuuden päivityksessä:', error);
      return 0;
    }
  }

  // Täydellinen siivous
  async performFullCleanup() {
    try {
      console.log('🧹 Aloitetaan täydellinen siivous...');
      
      const conversationsDeleted = await this.cleanupOldConversations();
      const waitingDeleted = await this.cleanupOldWaiting();
      const usersUpdated = await this.updateUserActivity();
      
      console.log('✅ Täydellinen siivous valmis:', {
        keskusteluja_poistettu: conversationsDeleted,
        waiting_poistettu: waitingDeleted,
        käyttäjiä_päivitetty: usersUpdated
      });
      
      return {
        conversationsDeleted,
        waitingDeleted,
        usersUpdated
      };
      
    } catch (error) {
      console.error('❌ Virhe täydellisessä siivouksessa:', error);
      return null;
    }
  }

}

// Singleton instance
export const cleanupService = new CleanupService();