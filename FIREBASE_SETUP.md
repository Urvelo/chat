# 🚀 ChatNest - Firebase Setup Guide

## Vaiheittainen ohje Firebase-projektin luomiseen

### 📋 Esivalmistelut

1. **Google-tili**: Varmista että sinulla on Google-tili
2. **Selain**: Käytä modernia selainta (Chrome, Firefox, Safari, Edge)

### 🔥 Firebase-projektin luonti

#### Vaihe 1: Firebase Console

1. Mene osoitteeseen: https://console.firebase.google.com
2. Klikkaa **"Create a project"** tai **"Add project"**
3. Anna projektille nimi (esim. "chatnest-prod" tai "my-chatnest")
4. Valitse haluatko Google Analytics (voit ottaa käyttöön tai jättää pois)
5. Klikkaa **"Create project"**
6. Odota projektin valmistumista (1-2 minuuttia)

#### Vaihe 2: Authentication setup

1. **Vasemmasta valikosta** → **Authentication**
2. Klikkaa **"Get started"**
3. Mene välilehdelle **"Sign-in method"**
4. Klikkaa **"Google"**
5. **Enable** → **Enable**
6. Valitse **Project support email** (oma sähköpostisi)
7. Klikkaa **"Save"**

#### Vaihe 3: Firestore Database setup

1. **Vasemmasta valikosta** → **Firestore Database**
2. Klikkaa **"Create database"**
3. **Secure rules** → Valitse **"Start in test mode"** (muuta myöhemmin turvallisemmaksi)
4. **Location** → Valitse läheisin sijainti (esim. europe-west3 for Finland)
5. Klikkaa **"Done"**

#### Vaihe 4: Web App setup

1. **Project Overview** (koti-ikoni)
2. Klikkaa **"</>" -ikonia** (Add app → Web)
3. **App nickname**: "ChatNest Web" (tai mikä tahansa)
4. **Register app** → **Register**
5. **Copy config** → **Kopioi koko firebaseConfig objekti**

### 🔧 Konfiguraation lisäys projektiin

#### Vaihe 5: Päivitä firebase.js

1. Avaa `src/firebase.js` tiedosto
2. Korvaa placeholder-arvot kopioituilla arvoilla:

```javascript
// ENNEN (placeholder):
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ...
};

// JÄLKEEN (omat arvot):
const firebaseConfig = {
  apiKey: "AIzaSyC123...",
  authDomain: "chatnest-prod.firebaseapp.com", 
  projectId: "chatnest-prod",
  storageBucket: "chatnest-prod.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### 🧪 Testaus

#### Vaihe 6: Testaa sovellus

1. **Terminaalissa**:
   ```bash
   npm run dev
   ```

2. **Avaa selaimessa**: http://localhost:5173

3. **Testaa Google-kirjautuminen**:
   - Klikkaa "Kirjaudu Google-tilillä"
   - Valitse Google-tili
   - Hyväksy oikeudet
   - Sovelluksen pitäisi siirtyä profiilin luontiin

### 🛡️ Turvallisuusasetusten päivitys (Production)

#### Vaihe 7: Firestore Rules (kun valmis deployaamaan)

**Firebase Console** → **Firestore** → **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Käyttäjäprofiilit - vain omat
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Odottavat käyttäjät - lue kaikki, kirjoita vain oma
    match /waiting/{waitingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.uid;
    }
    
    // Chat-huoneet - vain jäsenet
    match /rooms/{roomId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.users[].uid;
      
      // Viestit huoneessa
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.senderId;
      }
    }
    
    // Raportit - vain luonti
    match /reports/{reportId} {
      allow create: if request.auth != null;
    }
  }
}
```

#### Vaihe 8: Authentication Domain (jos deployaat)

**Authentication** → **Settings** → **Authorized domains**:
- Lisää oma domainisi (esim. `chatnest.vercel.app`)

### 🚀 Production Deployment

#### Vaihe 9: Vercel Deployment

1. **Push GitHubiin**:
   ```bash
   git add .
   git commit -m "Firebase config updated"
   git push origin main
   ```

2. **Vercel.com**:
   - Import GitHub repository
   - Framework: React (tunnistaa Vite automaattisesti)
   - Deploy

3. **Domain Firebase:een**:
   - Kopioi Vercel URL (esim. `chatnest-abc123.vercel.app`)
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add domain

### ❗ Yleisiä ongelmia ja ratkaisut

#### "API key not valid"
- ✅ Tarkista että kopioit koko firebaseConfig-objektin
- ✅ Varmista että Web App on luotu Firebase Consolessa

#### "Auth domain not verified"
- ✅ Lisää domain Authorized domains -listaan
- ✅ Tarkista että domain on oikeinkirjoitettu

#### "Permission denied"
- ✅ Tarkista Firestore Rules
- ✅ Varmista että Authentication toimii

#### Kirjautuminen ei toimi
- ✅ Tarkista että Google Sign-In on enabled
- ✅ Varmista että domain on authorized

### 📞 Tuki

Jos kohtaat ongelmia:

1. **Firebase Console** → **Usage** → Tarkista virheet
2. **Developer Tools** → **Console** → Tarkista JavaScript-virheet  
3. **Network tab** → Tarkista HTTP-pyynnöt

### 🎉 Valmis!

Kun kaikki on valmista, sinulla on:
- ✅ Toimiva Firebase-projekti
- ✅ Google-autentikaatio
- ✅ Firestore-tietokanta
- ✅ Turvallinen chat-sovellus
- ✅ Production-valmis deployment

**Onnea uuden ChatNest-sovelluksesi kanssa! 🔥**