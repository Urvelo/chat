// Firebase Configuration - Chat nuorille (Oikea Firebase cross-device)
import { initializeApp } from 'firebase/app';
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
  apiKey: "AIzaSyDHm9eBJPOcJJ0uC3InlUDnFmwNensq2bI",
  authDomain: "chat-d8df8.firebaseapp.com",
  projectId: "chat-d8df8",
  messagingSenderId: "1080868878464",
  appId: "1:1080868878464:web:5c79175f7265e5abbece65",
  measurementId: "G-Z7Y17XSPMG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

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

console.log('🔥 Oikea Firebase käytössä - laitteet yhdistyvät!');
console.log('� Pelkkä chat ilman Storage - ei kustannuksia!');