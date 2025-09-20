// Yksinkertainen keskustelujen tallennuspalvelu
// Tallentaa vain rooms-kokoelmaan 2 päivän säilytyksellä
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  setDoc 
} from '../firebase';

/**
 * Tallentaa keskustelun rooms-kokoelmaan yksinkertaisessa muodossa
 * Säilytys: 2 päivää, sen jälkeen Firebase Rules poistaa automaattisesti
 * @param {string} roomId - Huoneen ID
 * @param {object} user1 - Ensimmäinen käyttäjä {uid, email, displayName}
 * @param {object} user2 - Toinen käyttäjä {uid, email, displayName}
 */
export const saveConversation = async (roomId, user1, user2) => {
  try {
    console.log('💾 Tallennetaan keskustelu rooms-kokoelmaan:', roomId);

    // Hae kaikki viestit
    const messagesQuery = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = [];
    
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        sender: data.senderId === user1?.uid ? (user1?.email || user1?.displayName) : (user2?.email || user2?.displayName),
        message: data.text || '',
        imageUrl: data.imageUrl || null,
        time: data.timestamp
      });
    });

    if (messages.length === 0) {
      console.log('ℹ️ Ei viestejä tallennettavaksi');
      return null;
    }

    // Yksinkertainen tallennusmuoto rooms-kokoelmaan
    const conversationData = {
      // 2 päivän säilytys (Firebase Rules hoitaa automaattisen poiston)
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 päivää
      savedAt: serverTimestamp(),
      
      // Käyttäjät (Gmail näkyviin)
      user1: user1?.email || user1?.displayName || 'Tuntematon',
      user2: user2?.email || user2?.displayName || 'Tuntematon',
      
      // Yksinkertainen viestihistoria
      conversation: messages,
      messageCount: messages.length
    };

    // Tallenna suoraan rooms-kokoelmaan ID:llä "saved_[roomId]"
    const savedRoomId = `saved_${roomId}`;
    await setDoc(doc(db, 'rooms', savedRoomId), conversationData);
    
    console.log('✅ Keskustelu tallennettu rooms-kokoelmaan:', savedRoomId);
    console.log(`📧 ${user1?.email || user1?.displayName} <-> ${user2?.email || user2?.displayName}`);
    console.log(`💬 ${messages.length} viestiä`);
    
    return savedRoomId;

  } catch (error) {
    console.error('❌ Virhe keskustelun tallennuksessa:', error);
    return null;
  }
};

/**
 * Tallentaa keskustelun automaattisesti kun huone suljetaan
 */
export const saveConversationFromRoom = async (roomId, roomData) => {
  try {
    if (!roomData?.users || roomData.users.length < 2) {
      console.log('ℹ️ Ei tarpeeksi käyttäjiä keskustelun tallennukseen');
      return null;
    }

    const [user1, user2] = roomData.users;
    return await saveConversation(roomId, user1, user2);
    
  } catch (error) {
    console.error('❌ Virhe keskustelun tallennuksessa:', error);
    return null;
  }
};

export default { saveConversation, saveConversationFromRoom };