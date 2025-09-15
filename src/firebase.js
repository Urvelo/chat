import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase-konfiguraatio - korvaa omilla arvoillasi Firebase Console:sta
// 1. Mene https://console.firebase.google.com
// 2. Luo uusi projekti tai valitse olemassa oleva
// 3. Ota käyttöön Authentication (Google Sign-In)
// 4. Ota käyttöön Firestore Database (aloita test mode)
// 5. Projektiasetukset -> Yleiset -> Web-sovellukset -> Kopioi config-arvot tähän:

const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// HUOM! Älä unohda vaihtaa yllä olevia placeholder-arvoja oikeisiin arvoihin!

// Alusta Firebase
const app = initializeApp(firebaseConfig);

// Exportit
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Google Provider asetukset
googleProvider.setCustomParameters({
  prompt: 'select_account',
});