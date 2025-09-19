# 🔥 ChatNest - Turvallinen Chat

Modern, secure chat application for safe communication.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 🛠️ Built With

- React + Vite
- Firebase Firestore
- Supabase (Google OAuth)
- Modern CSS

## 🔒 Security Features

- **Google OAuth** - Secure authentication
 - **Auto-moderation** - OpenAI Moderation API (with zero tolerance for minors) + offline text filtering
 - **Image handling (current)** - ImgBB uploads with 24h auto-delete, moderation on upload, and cleanup using delete URLs
 - **Optional private images (future)** - Can switch to Firebase Storage (private paths) once a storage bucket is configured

## ✨ Features

- Real-time chat with Firebase
- ChatGPT-style modern UI
- Image sharing with moderation
- Background music option
- Mobile-responsive design

## ⚙️ Configuration

Create a `.env` file (for Vite, e.g. `.env.local`) and add:

```
# Required for image uploads via ImgBB
VITE_IMGBB_API_KEY=your_imgbb_api_key
```

Notes:
- With ImgBB, image links are public until they expire (~24h). If you need non-public access, use a private storage bucket (see below).
- To use private Firebase Storage instead of ImgBB, ensure your Firebase config includes a valid `storageBucket`. Without this you will get the error: "Firebase Storage: No default bucket." Once configured, you can switch the upload flow to Storage.

## 🧩 Moderation

- Uses OpenAI Moderation API to check text and images.
- Zero tolerance for any content involving minors.
- Relaxed thresholds for non-sexual, non-minor categories to reduce false positives.

## 🧪 Troubleshooting

- Error: `Firebase Storage: No default bucket` → Add `storageBucket` to your Firebase config (in the Firebase Console under Storage) or keep using ImgBB uploads.
- Images visible on ImgBB before deletion → This is expected; links are public until they auto-expire (24h).

## 📄 License

MIT License
