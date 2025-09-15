# 🔧 ChatNest - Laitteiden välinen yhteys

## ⚠️ Nykyinen ongelma
Mock Firebase käyttää localStorage:a, joka ei toimi laitteiden välillä. Jokainen laite näkee vain oman datansa.

## ✅ Ratkaisu - Oikea Firebase

### 1. Korjaa Firestore Rules
1. Mene: https://console.firebase.google.com/project/chat-d8df8/firestore/rules
2. Korvaa rules seuraavalla:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Klikkaa **"Publish"**

### 2. Vaihda oikeaan Firebase
```bash
cd /workspaces/chat
mv src/firebase.js src/firebase-mock.js
mv src/firebase-real.js src/firebase.js
npm run build
git add . && git commit -m "🔥 Oikea Firebase käytössä - cross-device toimii!"
git push
```

### 3. Testaa
- Avaa sovellus eri laitteilla
- Kirjaudu sisään molemmilla
- Aloita chat - pitäisi yhdistyä!

## 🛠️ Paluu mock-modeen (jos tarvii)
```bash
mv src/firebase.js src/firebase-real.js
mv src/firebase-mock.js src/firebase.js
```

## 📱 Testiosoite
https://chat-pi-lilac.vercel.app