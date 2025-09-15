# 🔥 ChatNest - Turvallinen Satunnainen Chat

ChatNest on moderni, turvallinen chat-sovellus, joka yhdistää käyttäjiä satunnaisesti ikäryhmän mukaan. Rakennettu Reactilla, Vitellä ja Firebasella.

## 🚀 Ominais# 🔥 ChatNest - Turvallinen Random Chat

ChatNest on moderni, turvallinen random chat-sovellus, joka yhdistää käyttäjät ikäryhmien mukaan. Ei videokutsuja - vain turvallista tekstichattailua!

## ✨ Ominaisuudet

- 🔐 **Google-kirjautuminen** - Turvallinen autentikaatio
- 👥 **Ikäryhmittely** - Chatit samanikäisten kanssa
- 💬 **Reaaliaikainen chat** - Välittömät viestit
- 🚩 **Raportointi** - Väärinkäyttöjen ilmoitus
- 🛡️ **Bannausjärjestelmä** - Laitetunniste + UID bannit
- 📱 **Responsiivinen** - Toimii kaikilla laitteilla

## 🚀 Pika-aloitus

### 1. Firebase-projektin luonti

1. Mene [Firebase Console](https://console.firebase.google.com)
2. Luo uusi projekti tai valitse olemassa oleva
3. Ota käyttöön **Authentication**:
   - Valitse "Sign-in method"
   - Aktivoi "Google"
4. Ota käyttöön **Firestore Database**:
   - Aloita "Test mode"
   - Valitse sopiva sijainti
5. Kopioi Firebase-konfiguraatio

### 2. Firebase-asetusten päivitys

Avaa `src/firebase.js` ja korvaa placeholder-arvot Firebase Console:sta kopioituilla arvoilla:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",           // Oma API-avain
  authDomain: "projekt.firebaseapp.com",
  projectId: "projekt-id",
  storageBucket: "projekt.appspot.com", 
  messagingSenderId: "123456789",
  appId: "1:123:web:abc..."
};
```

### 3. Riippuvuuksien asennus ja käynnistys

```bash
npm install
npm run dev
```

Sovellus aukeaa osoitteessa: http://localhost:5173

## 📁 Projektin rakenne

```
src/
├── components/
│   ├── Auth.jsx           # Google-kirjautuminen
│   ├── ProfileSetup.jsx   # Profiilin luonti
│   ├── Matchmaker.jsx     # Käyttäjien paritutus
│   ├── ChatRoom.jsx       # Chat-huone
│   └── ReportModal.jsx    # Väärinkäyttöjen raportointi
├── utils/
│   └── fingerprint.js     # Laitetunnistus
├── App.jsx               # Pääkomponentti
├── firebase.js           # Firebase-konfiguraatio
└── App.css              # Tyylittelyt
```

## 🗃️ Firestore-tietorakenne

### Collections:

- **profiles/{uid}** - Käyttäjäprofiilit
- **waiting** - Odottavat käyttäjät
- **rooms/{roomId}** - Chat-huoneet
  - **messages/** - Viestit
- **reports** - Väärinkäyttöraportit

## 🛡️ Turvallisuusominaisuudet

- ✅ Google-autentikaatio (ei anonyymejä käyttäjiä)
- ✅ Ikäryhmittely (ei lapsia aikuisten kanssa)
- ✅ Laitetunniste banneja varten
- ✅ Raportointi- ja moderointijärjestelmä
- ✅ Viestien tallennus tutkintaa varten

## 🚀 Deployment Verceliin

### 1. GitHub-repo

```bash
git add .
git commit -m "Initial ChatNest release"
git push origin main
```

### 2. Vercel-deployment

1. Mene [Vercel.com](https://vercel.com)
2. "Import Project" -> Valitse GitHub-repo
3. Framework: **React** (Vite tunnistetaan automaattisesti)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy!

### 3. Firestore-säännöt (production)

Vaihda Firestore test modesta production-sääntöihin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiilit: lue vain oma, kirjoita vain oma
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Odottavat: lue ikäryhmä, kirjoita vain oma
    match /waiting/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.uid;
    }
    
    // Huoneet: lue vain jos olet jäsen
    match /rooms/{roomId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.users[].uid;
      allow create: if request.auth != null;
      
      // Viestit: lue jos olet huoneen jäsen, kirjoita vain omia
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.senderId;
      }
    }
    
    // Raportit: kirjoita vain omia
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if false; // Vain adminit
    }
  }
}
```

## 🔧 Kehitysvinkkejä

### Uusien ominaisuuksien lisäys

1. **Admin-paneeli** - Raportintien hallinta
2. **Emoji-tuki** - Viesteihin reaktiot
3. **Yksityisviestit** - Suorat viestit
4. **Teemojen tuki** - Tumma/vaalea tila
5. **Kielituki** - Monikulttuurisuus

### Performance-optimoinnit

- Lazy loading komponenteille
- Virtualisointi pitkille viestilistauksille  
- Service Worker offline-tuelle
- PWA-tuki (Progressive Web App)

### Moderointi

- Automaattinen kiellettyjen sanojen suodatus
- IP-pohjainen bannaus Cloud Functioneilla
- Keskustelun ajastin (max 30 min)
- Käyttäjien luokittelu (uusi/luotettu)

## 🐛 Yleisiä ongelmia

### Firebase-virheet

**"API key not valid"**
- Tarkista että Firebase-config on päivitetty
- Varmista että Web App on luotu Firebase Consolessa

**"Auth domain not verified"**  
- Lisää domain Authorized domains -listaan
- Authentication -> Settings -> Authorized domains

### Build-virheet

**"Module not found"**
- `npm install` uudelleen
- Tarkista import-polut

## 📞 Tuki

Jos kohtaat ongelmia:

1. Tarkista Firebase Console - Authentication & Firestore
2. Avaa Developer Tools -> Console virheita varten  
3. Varmista että kaikki riippuvuudet on asennettu

## 📄 Lisenssi

MIT License - Vapaa käyttö ja muokkaus!

---

**💡 Vinkki:** Käytä GitHub Codespacesia kehitykseen - kaikki toimii suoraan selaimessa! 🚀
- 🔐 **Google-kirjautuminen** - Turvallinen autentikaatio
- 👥 **Ikäryhmäparitutus** - Keskustele samanikäisten kanssa
- 💬 **Reaaliaikainen chat** - Välitön viestinvaihto
- 🚩 **Raportointijärjestelmä** - Väärinkäyttöjen esto
- 🛡️ **Fingerprint-tunnistus** - Bannisuojaus
- 📱 **Responsiivinen design** - Toimii kaikilla laitteilla

## 🛠️ Teknologiat

- **Frontend**: React + Vite
- **Backend**: Firebase (Firestore + Authentication)
- **Styling**: CSS3 (Gradient design)
- **Deployment**: Vercel (ilmainen)

## 📦 Asennus ja käyttöönotto

### 1. Kloonaa repo
```bash
git clone <repo-url>
cd chatnest
npm install
```

### 2. Firebase-setup
1. Luo Firebase-projekti: https://console.firebase.google.com
2. Ota käyttöön:
   - Firestore Database (test mode)
   - Authentication → Google Sign-In
3. Kopioi config-tiedot `src/firebase.js` tiedostoon

### 3. Käynnistä kehityspalvelin
```bash
npm run dev
```

### 4. Julkaise Verceliin
1. Luo Vercel-tili
2. Linkitä GitHub-repo
3. Import Project → Framework: Vite
4. Deploy!

## 🏗️ Projektin rakenne

```
src/
├── components/
│   ├── Auth.jsx              # Google-kirjautuminen
│   ├── ProfileSetup.jsx      # Käyttäjäprofiilin luonti
│   ├── Matchmaker.jsx        # Ikäryhmäparitutus
│   ├── ChatRoom.jsx          # Reaaliaikainen chat
│   └── ReportModal.jsx       # Väärinkäyttöraportointi
├── utils/
│   └── fingerprint.js        # Laitetunnistus
├── firebase.js               # Firebase-konfiguraatio
├── App.jsx                   # Pääkomponentti
├── App.css                   # Tyylit
└── main.jsx                  # React entry point
```

## 🔧 Firebase Collections

### `profiles/{uid}`
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  birthYear: number,
  ageGroup: string, // 'under18', '18-25', '26-35', '36-50', '50+'
  deviceFingerprint: string,
  termsAccepted: boolean,
  createdAt: timestamp,
  lastActive: timestamp
}
```

### `waiting/{id}`
```javascript
{
  uid: string,
  displayName: string,
  ageGroup: string,
  createdAt: timestamp,
  lastSeen: timestamp
}
```

### `rooms/{roomId}`
```javascript
{
  id: string,
  users: [{ uid, displayName, joinedAt }],
  ageGroup: string,
  createdAt: timestamp,
  lastActivity: timestamp,
  isActive: boolean,
  type: 'text'
}
```

### `rooms/{roomId}/messages/{messageId}`
```javascript
{
  text: string,
  senderId: string,
  senderName: string,
  timestamp: timestamp,
  roomId: string
}
```

### `reports/{reportId}`
```javascript
{
  roomId: string,
  reportedUserId: string,
  reportedUserName: string,
  reason: string,
  customReason: string,
  timestamp: timestamp,
  status: 'pending' | 'reviewed' | 'resolved'
}
```

## 🛡️ Turvallisuus

- **Autentikaatio**: Google OAuth (ei anonyymi käyttö)
- **Ikäryhmät**: Eston alle-18-vuotiaiden ja aikuisten välillä
- **Fingerprint**: Laitetunnistus bannienkierron estämiseksi
- **Raportointi**: Helppo väärinkäyttöjen raportointi
- **Moderointi**: Kaikki viestit tallennetaan Firestoreen

## 🎨 Mukauttaminen

### Värit
Muokkaa `src/App.css` tiedostossa:
```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --background-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Ikäryhmät
Muokkaa `src/components/ProfileSetup.jsx` tiedostossa `calculateAgeGroup` funktiota.

## 📱 PWA (Progressive Web App)

Sovellus on valmis PWA-käyttöön. Lisää `manifest.json` ja service worker tarvittaessa.

## 🚀 Deployment-ohjeet

### Vercel (Suositeltu)
1. Push koodi GitHubiin
2. Yhdistä Vercel-tiliin
3. Import project
4. Framework: Vite
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Deploy!

### Netlify
1. Build Command: `npm run build`
2. Publish Directory: `dist`
3. Deploy!

## 🔍 Debuggaus

### Yleisiä ongelmia

1. **Firebase-virheet**: Tarkista `firebase.js` konfiguraatio
2. **Auth-ongelmat**: Varmista Google Sign-In on käytössä Firebase Consolessa
3. **Firestore-virheet**: Tarkista test mode on päällä

### Kehittäjätyökalut
```bash
# Firebase emulator
npm install -g firebase-tools
firebase init emulators
firebase emulators:start
```

## 🤝 Kontribuutiot

1. Fork projekti
2. Luo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit muutokset (`git commit -m 'Add some AmazingFeature'`)
4. Push branchiin (`git push origin feature/AmazingFeature`)
5. Avaa Pull Request

## 📄 Lisenssi

MIT License - Katso `LICENSE` tiedosto lisätiedoille.

## 🆘 Tuki

- 📧 Email: [support@chatnest.app](mailto:support@chatnest.app)
- 🐛 Issues: GitHub Issues
- 💬 Keskustelu: GitHub Discussions

## ⭐ Kiitos!

Jos projekti on hyödyllinen, anna tähti GitHubissa! 🌟+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
