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
};

// Tallenna data localStorage:een
const saveMockData = () => {
  localStorage.setItem('chatnest-mock-data', JSON.stringify(mockData));
};

// Alusta data
loadMockData();

// Mock Firestore functions
export const db = {};

export const doc = (collection, id) => ({ collection, id });

export const setDoc = async (docRef, data) => {
  const { collection, id } = docRef;
  
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
  const { collection, id } = docRef;
  const data = mockData[collection]?.[id];
  
  return {
    exists: () => !!data,
    data: () => data || {}
  };
};

export const collection = (name) => ({ name });

export const query = (collection, ...conditions) => ({ collection, conditions });

export const where = (field, operator, value) => ({ field, operator, value });

export const orderBy = (field, direction = 'asc') => ({ field, direction });

export const addDoc = async (collectionRef, data) => {
  const collectionName = collectionRef.name;
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