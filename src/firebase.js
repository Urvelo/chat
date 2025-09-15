// Firebase Configuration - ChatNest
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Export Firebase functions
export {
  signInWithPopup,
  signOut,
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

console.log('🔥 Firebase initialisoitu onnistuneesti! ChatNest on valmis käyttöön.');