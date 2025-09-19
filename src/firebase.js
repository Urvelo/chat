// Firebase Configuration - Chat nuorille (Oikea Firebase cross-device)
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage for private image uploads
export const storage = getStorage(app);

// Export Firestore functions
export {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp
};

// Export Storage helpers
export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

console.log('🔥 Oikea Firebase käytössä - laitteet yhdistyvät!');
console.log('🗂️ Firebase Storage käytössä yksityisiä kuvia varten.');