# Coinvest Backend — PoC

Simple Node.js + Express API for the Coinvest MVP.

## Setup

1. **Copy environment file:**
```bash
cp .env.example .env
```

2. **Update `.env` with your credentials:**
```
SUPABASE_URL=https://mizpqadzodpgyektlgrx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here
JWT_SECRET=your_secret_key_min_32_chars
PORT=3000
```

3. **Install dependencies:**
```bash
npm install
```

4. **Run the server:**
```bash
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints (PoC Phase)

### Authentication
- `POST /auth/signup` — Register new user
- `POST /auth/login` — User login
- `POST /auth/logout` — User logout

### Ideas
- `POST /ideas` — Create idea (idea holders only)
- `GET /ideas` — List ideas (filtered by role)
- `GET /ideas/:idea_id` — Get idea details
- `PUT /ideas/:idea_id` — Update idea (owner only)
- `DELETE /ideas/:idea_id` — Delete idea (owner or admin)

### Likes & Favorites
- `POST /ideas/:idea_id/like` — Like an idea
- `DELETE /ideas/:idea_id/like` — Unlike an idea
- `POST /ideas/:idea_id/favorite` — Add to favorites
- `DELETE /ideas/:idea_id/favorite` — Remove from favorites
- `GET /users/me/favorites` — Get user's favorites

## Testing with Expo/Mobile

The API is mobile-friendly and works with Expo.

**Example: Sign up from Expo**

```javascript
const response = await fetch('http://your-backend-url/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    role: 'idea_holder',
    first_name: 'John',
    last_name: 'Doe'
  })
});

const data = await response.json();
console.log(data.token); // Save this token for future requests
```

**Example: List ideas with authentication**

```javascript
const response = await fetch('http://your-backend-url/ideas', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(data.data); // Array of ideas
```

## Next Steps (Phase 2 PoC)

- [ ] Pitch requests endpoints
- [ ] Chat rooms & messages
- [ ] Meetings
- [ ] Task voting
- [ ] Admin screening endpoints
- [ ] Notifications
- [ ] User profile endpoints

## Database

Connected to Supabase PostgreSQL with Row-Level Security (RLS) policies.

See `../API_DESIGN.md` for full API specification.
