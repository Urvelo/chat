# 🚀 ChatNest - Käyttöönotto-ohjeet

## 1. Firebase-projektin luominen

### Vaihe 1: Luo Firebase-projekti
1. Mene osoitteeseen: https://console.firebase.google.com
2. Klikkaa "Create a project" tai "Luo projekti"
3. Anna projektille nimi (esim. "chatnest-prod")
4. Valitse Google Analytics (valinnainen)
5. Klikkaa "Create project"

### Vaihe 2: Ota käyttöön Authentication
1. Siirry vasemmalla "Authentication" osioon
2. Klikkaa "Get started"
3. Mene "Sign-in method" välilehdelle
4. Ota käyttöön "Google" provider:
   - Klikkaa Google → Enable
   - Syötä Project support email
   - Save

### Vaihe 3: Ota käyttöön Firestore Database
1. Siirry vasemmalla "Firestore Database" osioon
2. Klikkaa "Create database"
3. Valitse "Start in test mode" (kehitykseen)
4. Valitse location (esim. europe-west3)
5. Done

### Vaihe 4: Lisää web app
1. Siirry Project Overview
2. Klikkaa </> ikoni (Add web app)
3. Anna app nimi (esim. "ChatNest Web")
4. Valitse "Also set up Firebase Hosting" (valinnainen)
5. Register app
6. **KOPIOI firebase config** - tämä tarvitaan seuraavassa vaiheessa!

## 2. Projektin konfigurointi

### Päivitä Firebase-asetukset
Avaa `src/firebase.js` ja korvaa placeholder-arvot omilla arvoillasi:

# 🚀 ChatNest - Deployment Guide

## Vercel Deployment (Ilmainen & Nopea)

### 📋 Esivalmistelut

1. ✅ Firebase-projekti luotu ja konfiguroitu (`FIREBASE_SETUP.md`)
2. ✅ Sovellus toimii paikallisesti (`npm run dev`)
3. ✅ Git repository on luotu

### 🌐 Vercel Deployment

#### Vaihe 1: GitHub Push

```bash
# Varmista että kaikki muutokset on commitoitu
git add .
git commit -m "ChatNest production ready"
git push origin main
```

#### Vaihe 2: Vercel Account

1. Mene: https://vercel.com
2. **Sign up** → **Continue with GitHub**
3. Hyväksy GitHub-oikeudet

#### Vaihe 3: Import Project

1. **Dashboard** → **Add New** → **Project**
2. **Import Git Repository** → Valitse `chat` repo
3. **Import** (älä muuta asetuksia)

#### Vaihe 4: Deploy Settings (Automaattisesti oikein)

```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

4. **Deploy** → Odota 2-3 minuuttia

#### Vaihe 5: Firebase Domain Authorization

1. Kopioi Vercel URL (esim. `chatnest-abc123.vercel.app`)
2. **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**
3. **Add domain** → Liitä URL (ilman https://)
4. **Save**

### 🔒 Production Security

#### Firestore Rules Update

**Firebase Console** → **Firestore** → **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiilit: lue ja kirjoita vain omaa
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Odottavat käyttäjät
    match /waiting/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.uid;
    }
    
    // Chat-huoneet
    match /rooms/{roomId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.users[].uid;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      
      // Viestit huoneessa
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.senderId;
      }
    }
    
    // Raportit
    match /reports/{reportId} {
      allow create: if request.auth != null;
    }
  }
}
```

**Publish** rules

### 🔄 Continuous Deployment

Jokainen push main-branchiin päivittää automaattisesti Vercel-sivuston!

```bash
# Tee muutoksia koodiin
git add .
git commit -m "Feature: emoji support"
git push origin main
# → Vercel deployaa automaattisesti
```

### 🎯 Production Checklist

- ✅ Firebase rules päivitetty
- ✅ Authorized domains lisätty
- ✅ HTTPS toimii (automaattinen Vercelissä)
- ✅ Error handling kunnossa
- ✅ Performance optimoitu
- ✅ Mobile responsive
- ✅ Accessibility testattu

### 🐛 Troubleshooting

#### Build Failed

```bash
# Tarkista riippuvuudet
npm install

# Testaa local build
npm run build

# Tarkista virheet
npm run dev
```

#### Firebase Errors

1. **Console Errors** → Firebase Console → **Usage**
2. **Network tab** → Tarkista API-kutsut
3. **Authentication** → Tarkista domains

---

## 🎉 Onneksi olkoon!

ChatNest on nyt live ja käytettävissä internetissä! 

**Jaa linkki ystäville ja nauti turvallisesta chattailusta! 🔥**

**Live URL:** `https://your-app-name.vercel.app`

## 3. Testaus paikallisesti

```bash
# Käynnistä kehityspalvelin
npm run dev

# Avaa selaimessa: http://localhost:5173
```

### Testausvaiheet:
1. ✅ Google-kirjautuminen toimii
2. ✅ Profiilin luonti onnistuu
3. ✅ Matchmaker-näkymä latautuu
4. ✅ Chat-toiminnallisuus (avaa kaksi selainta testaamista varten)
5. ✅ Raportointi toimii

## 4. Vercel Deployment

### Vaihe 1: Pushaa koodi GitHubiin
```bash
git add .
git commit -m "ChatNest valmis - ensimmäinen versio"
git push origin main
```

### Vaihe 2: Yhdistä Verceliin
1. Mene osoitteeseen: https://vercel.com
2. Kirjaudu GitHub-tilillä
3. Klikkaa "New Project"
4. Valitse ChatNest-repo
5. Asetukset:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Vaihe 3: Deploy
1. Klikkaa "Deploy"
2. Odota 1-2 minuuttia
3. Saat HTTPS-linkin valmiiseen sovellukseen!

## 5. Turvallisuus ja tuotanto

### Firebase Security Rules (Tuotantoon)
Kun sovellus on valmis, päivitä Firestore Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiilit - käyttäjä voi lukea ja muokata vain omaa profiiliaan
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Waiting - käyttäjä voi lukea samanikäisten listaa ja muokata omaa statustaan
    match /waiting/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.uid;
    }
    
    // Huoneet - käyttäjä voi lukea vain huoneita joissa on mukana
    match /rooms/{roomId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.users[].uid;
      allow write: if request.auth != null;
      
      // Viestit huoneessa
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.senderId;
      }
    }
    
    // Raportit - kaikki kirjautuneet voivat luoda raportteja
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if false; // Vain adminit voivat lukea
    }
  }
}
```

### Google Authentication Setup
Firebase Console → Authentication → Settings:
1. Lisää authorized domain: `your-app.vercel.app`
2. Aseta OAuth redirect URIs

## 6. Ylläpito ja seuranta

### Firebase Analytics
Ota käyttöön Analytics seurataksesi:
- Aktiivisten käyttäjien määrää
- Chat-istuntojen pituutta
- Virheiden määrää

### Raporttien seuranta
Luo säännöllinen rutiini tarkistaa `reports` collection ja käsitellä väärinkäyttöraportit.

### Backup
Firebase tarjoaa automaattiset backupit, mutta harkitse säännöllisiä exportteja kriittiselle datalle.

## 7. Seuraavat ominaisuudet (Tulevaisuudessa)

- 🎥 Videochat (WebRTC)
- 🌍 Kielivalinta
- 🎨 Teemat ja dark mode
- 📊 Admin dashboard raporttien käsittelyyn
- 🤖 AI-moderointi viestien skannaukseen
- 📱 Mobile app (React Native)

## 8. Tuki ja ylläpito

### Yleisiä ongelmia:
- **"Firebase not configured"** → Tarkista firebase.js asetukset
- **"Auth domain not authorized"** → Lisää domain Firebase Consolessa
- **"Permission denied"** → Tarkista Firestore rules

### Logien tarkistus:
- Vercel: Project → Functions → View logs
- Firebase: Console → Project → Logs

---

**🎉 Onnea! ChatNest on nyt käytössä!** 

Muista päivittää turvallisuusasetukset ennen julkista lanseerausta.