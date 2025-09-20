// Keskustelujen tallennuspalvelu
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  query,
  orderBy,
  serverTimestamp 
} from '../firebase';

/**
 * Tallentaa keskustelun molempien käyttäjien Gmail-osoitteineen helppolukuiseen muotoon
 * @param {string} roomId - Huoneen ID
 * @param {object} user1 - Ensimmäinen käyttäjä {uid, email, displayName}
 * @param {object} user2 - Toinen käyttäjä {uid, email, displayName}
 * @param {string} reason - Tallennuksen syy (esim. "chat_ended", "reported_user", "admin_review")
 */
export const saveConversation = async (roomId, user1, user2, reason = 'chat_ended') => {
  try {
    console.log('💾 Tallennetaan keskustelu:', { roomId, user1: user1?.email, user2: user2?.email, reason });

    // Hae kaikki viestit aikajärjestyksessä
    const messagesQuery = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = [];
    
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        senderName: data.senderName || data.displayName || 'Tuntematon',
        text: data.text || '',
        imageUrl: data.imageUrl || null,
        timestamp: data.timestamp,
        type: data.type || 'message'
      });
    });

    if (messages.length === 0) {
      console.log('ℹ️ Ei viestejä tallennettavaksi');
      return null;
    }

    // Hae käyttäjien Gmail-osoitteet profiileista
    const getUserEmail = async (userId) => {
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', userId));
        if (profileDoc.exists()) {
          return profileDoc.data().email || 'Ei sähköpostia';
        }
        return 'Profiilia ei löydy';
      } catch (error) {
        console.warn('⚠️ Virhe Gmail-osoitteen haussa:', userId, error);
        return 'Virhe sähköpostin haussa';
      }
    };

    const user1Email = user1?.email || await getUserEmail(user1?.uid);
    const user2Email = user2?.email || await getUserEmail(user2?.uid);

    // Luo helppolukuinen keskustelurakenne
    const conversationData = {
      // HEADER: Käyttäjätiedot (Gmail-osoitteet näkyviin)
      conversationId: roomId,
      savedAt: serverTimestamp(),
      reason,
      
      // KÄYTTÄJÄT (Gmail-osoitteet ensisijaisina)
      user1: {
        gmail: user1Email,
        uid: user1?.uid,
        displayName: user1?.displayName || 'Käyttäjä 1'
      },
      user2: {
        gmail: user2Email,
        uid: user2?.uid,
        displayName: user2?.displayName || 'Käyttäjä 2'
      },
      
      // TILASTOT
      messageCount: messages.length,
      duration: messages.length > 1 ? {
        started: messages[0].timestamp,
        ended: messages[messages.length - 1].timestamp
      } : null,
      
      // VIESTIT: Helppolukuisessa muodossa
      messages: messages.map(msg => ({
        // Näytä lähettäjä Gmail-osoitteella
        sender: msg.senderId === user1?.uid ? user1Email : user2Email,
        senderName: msg.senderName,
        message: msg.text,
        imageUrl: msg.imageUrl,
        time: msg.timestamp,
        type: msg.type
      })),

      // RAAKA DATA: Säilytä alkuperäiset ID:t
      rawData: {
        roomId,
        user1Id: user1?.uid,
        user2Id: user2?.uid,
        messageIds: messages.map(m => m.id)
      }
    };

    // Tallenna conversations-kokoelmaan
    const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);
    
    console.log('✅ Keskustelu tallennettu:', conversationRef.id);
    console.log(`📧 Käyttäjät: ${user1Email} <-> ${user2Email}`);
    console.log(`💬 Viestit: ${messages.length} kpl`);
    
    return {
      conversationId: conversationRef.id,
      user1Email,
      user2Email,
      messageCount: messages.length
    };

  } catch (error) {
    console.error('❌ Virhe keskustelun tallennuksessa:', error);
    throw error;
  }
};

/**
 * Tallentaa keskustelun automaattisesti kun huone suljetaan
 * @param {string} roomId - Huoneen ID
 * @param {object} roomData - Huoneen data jossa users-array
 * @param {string} reason - Syy tallennukseen
 */
export const saveConversationFromRoom = async (roomId, roomData, reason = 'chat_ended') => {
  try {
    if (!roomData?.users || roomData.users.length < 2) {
      console.log('ℹ️ Ei tarpeeksi käyttäjiä keskustelun tallennukseen');
      return null;
    }

    const [user1, user2] = roomData.users;
    return await saveConversation(roomId, user1, user2, reason);
    
  } catch (error) {
    console.error('❌ Virhe automaattisessa keskustelun tallennuksessa:', error);
    return null;
  }
};

export default { saveConversation, saveConversationFromRoom };