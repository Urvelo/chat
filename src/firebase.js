// Firebase Configuration - ChatNest (Oikea Firebase cross-device)
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
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
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHm9eBJPOcJJ0uC3InlUDnFmwNensq2bI",
  authDomain: "chat-d8df8.firebaseapp.com",
  projectId: "chat-d8df8",
  storageBucket: "chat-d8df8.firebasestorage.app",
  messagingSenderId: "1080868878464",
  appId: "1:1080868878464:web:5c79175f7265e5abbece65",
  measurementId: "G-Z7Y17XSPMG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Export Firestore functions
export {
  doc,
  setDoc,
  getDoc,
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

// Export Storage functions
export {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

console.log('🔥 Oikea Firebase käytössä - laitteet yhdistyvät!');
console.log('💾 Storage käytössä - kuvat ja tiedostot tuettu!');