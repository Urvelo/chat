// Firebase Configuration - ChatNest
// Käytä mock-implementaatiota kunnes Firestore-säännöt korjataan

// Mock Firebase - toimii ilman autentikointia
console.log('🚀 ChatNest käynnistyy Mock-modessa - ei vaadi Firestore-sääntöjä!');

// Mock data storage
let mockData = {
  profiles: {},
  rooms: {},
  messages: {},
  waitingUsers: [],
  reports: {}
};

// Luo simuloituja käyttäjiä testikäyttöön (15-20 vuotiaat)
const createMockUsers = () => {
  const mockUsers = [
    { name: 'Aino', age: 17 },
    { name: 'Eetu', age: 16 },
    { name: 'Liisa', age: 18 },
    { name: 'Joona', age: 19 },
    { name: 'Elli', age: 15 },
    { name: 'Matias', age: 20 },
    { name: 'Ida', age: 17 },
    { name: 'Vili', age: 16 },
    { name: 'Siiri', age: 18 },
    { name: 'Roni', age: 19 }
  ];

  mockUsers.forEach((user, index) => {
    const uid = `mock-user-${index + 1}`;
    mockData.profiles[uid] = {
      uid: uid,
      displayName: user.name,
      age: user.age,
      email: `${user.name.toLowerCase()}@mock.local`,
      deviceFingerprint: `mock-device-${index}`,
      termsAccepted: true,
      createdAt: new Date(Date.now() - Math.random() * 86400000), // Viime 24h sisään
      lastActive: new Date(Date.now() - Math.random() * 3600000)  // Viime tunnin sisään
    };
  });

  console.log('🤖 Luotu simuloituja käyttäjiä:', Object.keys(mockData.profiles).length);
};

// Lataa data localStorage:sta
const loadMockData = () => {
  const saved = localStorage.getItem('chatnest-mock-data');
  if (saved) {
    try {
      mockData = JSON.parse(saved);
    } catch (e) {
      console.log('Alustetaan uusi mock data');
    }
  }
  
  // Luo simuloituja käyttäjiä jos ei ole
  if (Object.keys(mockData.profiles).length === 0) {
    createMockUsers();
  }
  
  // Lisää satunnaisia käyttäjiä odottamaan
  setTimeout(() => {
    const profileIds = Object.keys(mockData.profiles);
    const randomUsers = profileIds.slice(0, 2 + Math.floor(Math.random() * 3));
    
    mockData.waitingUsers = randomUsers.map(uid => ({
      uid: uid,
      profile: mockData.profiles[uid],
      joinedAt: new Date(Date.now() - Math.random() * 600000) // Viime 10 min sisään
    }));
    
    saveMockData();
    console.log('👥 Simuloituja käyttäjiä odottamassa:', mockData.waitingUsers.length);
  }, 2000);
};

// Tallenna data localStorage:een
const saveMockData = () => {
  localStorage.setItem('chatnest-mock-data', JSON.stringify(mockData));
};

// Alusta data
loadMockData();

// Mock Firestore functions
export const db = {};

export const doc = (collectionOrDb, collectionName, id) => {
  // Käsittele eri tapoja kutsua doc()
  if (typeof collectionOrDb === 'string') {
    // doc('collection', 'id')
    return { collection: collectionOrDb, id: collectionName };
  } else if (collectionName && id) {
    // doc(db, 'collection', 'id')
    return { collection: collectionName, id: id };
  } else {
    // doc(collection, 'id')
    return { collection: collectionOrDb.name || 'unknown', id: collectionName };
  }
};

export const setDoc = async (docRef, data) => {
  let collection, id;
  
  if (docRef.collection && docRef.id) {
    collection = docRef.collection;
    id = docRef.id;
  } else {
    console.warn('setDoc: virheellinen docRef', docRef);
    return;
  }
  
  if (!mockData[collection]) {
    mockData[collection] = {};
  }
  
  mockData[collection][id] = {
    ...data,
    createdAt: new Date(),
    lastActive: new Date()
  };
  
  saveMockData();
  console.log(`✅ Mock: Tallennettu ${collection}/${id}:`, data);
};

export const getDoc = async (docRef) => {
  let collection, id;
  
  if (docRef.collection && docRef.id) {
    collection = docRef.collection;
    id = docRef.id;
  } else {
    console.warn('getDoc: virheellinen docRef', docRef);
    return {
      exists: () => false,
      data: () => ({})
    };
  }
  
  const data = mockData[collection]?.[id];
  
  return {
    exists: () => !!data,
    data: () => data || {}
  };
};

export const collection = (dbOrName, collectionName) => {
  // Käsittele eri tapoja kutsua collection()
  if (typeof dbOrName === 'string') {
    // collection('name')
    return { name: dbOrName };
  } else if (collectionName) {
    // collection(db, 'name')
    return { name: collectionName };
  } else {
    return { name: 'unknown' };
  }
};

export const query = (collection, ...conditions) => ({ collection, conditions });

export const where = (field, operator, value) => ({ field, operator, value });

export const orderBy = (field, direction = 'asc') => ({ field, direction });

export const addDoc = async (collectionRef, data) => {
  let collectionName;
  
  if (collectionRef.name) {
    collectionName = collectionRef.name;
  } else {
    console.warn('addDoc: virheellinen collectionRef', collectionRef);
    collectionName = 'unknown';
  }
  
  const id = 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  
  if (!mockData[collectionName]) {
    mockData[collectionName] = {};
  }
  
  mockData[collectionName][id] = {
    id,
    ...data,
    createdAt: new Date()
  };
  
  saveMockData();
  console.log(`✅ Mock: Luotu ${collectionName}/${id}:`, data);
  
  return { id };
};

// Mock real-time listeners
const listeners = new Map();

export const onSnapshot = (query, callback) => {
  const listenerId = 'listener-' + Math.random().toString(36).substr(2, 9);
  
  // Simuloi reaaliaikaista dataa
  const simulateData = () => {
    const collectionName = query.collection?.name || 'unknown';
    const collectionData = mockData[collectionName] || {};
    
    // Erikoiskäsittely waitingUsers:lle - simuloi aktiivisia käyttäjiä
    if (collectionName === 'waitingUsers') {
      // Lisää satunnainen määrä simuloituja käyttäjiä
      const currentTime = Date.now();
      const simulatedUsers = [];
      
      // 30% todennäköisyys että löytyy käyttäjä
      if (Math.random() < 0.3) {
        const profileIds = Object.keys(mockData.profiles);
        const randomProfile = mockData.profiles[profileIds[Math.floor(Math.random() * profileIds.length)]];
        
        if (randomProfile) {
          simulatedUsers.push({
            id: `waiting-${randomProfile.uid}`,
            data: () => ({
              uid: randomProfile.uid,
              profile: randomProfile,
              joinedAt: new Date(currentTime - Math.random() * 300000) // Viime 5 min sisään
            })
          });
        }
      }
      
      callback({ 
        docs: simulatedUsers, 
        empty: simulatedUsers.length === 0,
        size: simulatedUsers.length 
      });
      return;
    }
    
    // Tavallinen data käsittely
    const docs = Object.values(collectionData).map(data => ({
      id: data.id || 'unknown',
      data: () => data,
      exists: true
    }));
    
    callback({ 
      docs, 
      empty: docs.length === 0,
      size: docs.length 
    });
  };
  
  // Ensimmäinen kutsu heti
  setTimeout(simulateData, 100);
  
  // Tallenna listener päivityksiä varten
  listeners.set(listenerId, setInterval(simulateData, 3000));
  
  // Palauta unsubscribe-funktio
  return () => {
    const interval = listeners.get(listenerId);
    if (interval) {
      clearInterval(interval);
      listeners.delete(listenerId);
    }
  };
};

export const updateDoc = async (docRef, data) => {
  const { collection, id } = docRef;
  
  if (mockData[collection]?.[id]) {
    mockData[collection][id] = {
      ...mockData[collection][id],
      ...data,
      lastActive: new Date()
    };
    saveMockData();
    console.log(`✅ Mock: Päivitetty ${collection}/${id}:`, data);
  }
};

export const deleteDoc = async (docRef) => {
  const { collection, id } = docRef;
  
  if (mockData[collection]?.[id]) {
    delete mockData[collection][id];
    saveMockData();
    console.log(`✅ Mock: Poistettu ${collection}/${id}`);
  }
};

export const serverTimestamp = () => new Date();

console.log('🎉 Mock Firebase valmis! ChatNest toimii täysin ilman oikeaa Firestore-yhteyttä.');
console.log('💡 Kun haluat käyttää oikeaa Firebasea, päivitä Firestore-säännöt konsolessa.');