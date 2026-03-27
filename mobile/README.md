# Coinvest Mobile App — PoC

React Native + Expo app for investors and idea holders.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Run on Expo:**
```bash
npx expo start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web

## Features (PoC)

✅ **Authentication**
- Login
- Signup with role selection (Investor / Idea Holder)

✅ **Ideas**
- Browse screened ideas (Investor view)
- Like/Unlike ideas
- Add to favorites
- View idea details with full information

✅ **Favorites**
- Saved ideas list
- Quick access to favorite pitches

⏳ **Chat** (Placeholder)
- Coming soon - real-time messaging

⏳ **Profile** (Basic)
- View profile info
- Account settings (placeholder)
- Logout

## Mock Data

Currently using mock API (`utils/api.js`). To connect real backend:

1. Update `utils/api.js` to call real API endpoints
2. Store JWT token in AsyncStorage
3. Add token to request headers

**Example:**
```javascript
// Replace mock API call with real API
const response = await fetch('http://your-backend:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

## Project Structure

```
mobile/
├── App.js                 # Main navigation
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js
│   │   └── SignupScreen.js
│   ├── ideas/
│   │   ├── IdeasListScreen.js
│   │   └── IdeaDetailScreen.js
│   ├── favorites/
│   │   └── FavoritesScreen.js
│   ├── chat/
│   │   └── ChatScreen.js
│   └── profile/
│       └── ProfileScreen.js
├── utils/
│   └── api.js             # API calls (mock or real)
└── app.json               # Expo config
```

## Navigation

- **Auth Stack:** Login → Signup
- **App Stack (Tabs):**
  - Ideas (browse ideas)
  - Favorites (saved ideas)
  - Chat (messaging)
  - Profile (user settings)
- **Modal:** Idea Details (from Ideas or Favorites)

## Colors & Theme

- **Primary:** #1D4ED8 (Deep Blue)
- **Secondary:** #0D9488 (Teal)
- **Background:** #F3F4F6 (Light Gray)
- **Text:** #1F2937 (Dark Gray)

## Next Steps

1. Connect real backend (replace mock API)
2. Add chat real-time messaging
3. Implement pitch request flow
4. Add task voting interface
5. Push notifications
6. Build for Android/iOS stores

## Testing

Mock credentials:
- Email: `investor@example.com`
- Password: `password123`
- Role: Investor

---

Ready to test on bolt.new or local Expo! 🚀
