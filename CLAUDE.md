# Coinvest Project — Claude Code Session Notes

## Current State (Updated)

### Repository: antomprev/coinvest

**Default Branch:** `master`

**Current Branches:**
- `master` — ✅ **MAIN** — Production branch with complete PoC merged
- `claude/explore-mobile-development-aPPqT` — Feature branch (archived, work merged to master)
- `claude/mobile-app-tech-research-VkCRj` — Old feature branch (not in use)

### What's on Master (Current)

**PoC Complete** with:
1. **Backend API** (`/backend`)
   - Node.js + Express
   - Auth endpoints (signup, login, logout)
   - Ideas CRUD (create, list, get, update, delete)
   - Likes & Favorites
   - Supabase integration with RLS

2. **Mobile App** (`/mobile`)
   - React Native + Expo
   - Auth screens (login, signup)
   - Ideas list & detail views
   - Favorites management
   - Chat & Profile screens (placeholders)
   - Mock API layer (ready to connect to backend)

3. **Database** (Supabase)
   - 17 tables created
   - Row-Level Security policies
   - Migration files in `/supabase/migrations/`

4. **Documentation**
   - `API_DESIGN.md` — 80+ endpoint specification
   - `SCHEMA.md` — Database schema
   - `backend/README.md` — Backend setup
   - `mobile/README.md` — Mobile app setup

### How to Work

**If starting fresh:**
1. Clone repo
2. Check out `master` branch
3. Choose what to work on:
   - Backend: `cd backend && npm install && npm start`
   - Mobile: `cd mobile && npm install && npm start`

**Git Workflow:**
1. Create feature branch from `master`: `git checkout -b feature/your-feature`
2. Make changes
3. Commit: `git commit -m "..."`
4. Push: `git push -u origin feature/your-feature`
5. Merge back to `master` when done

**Important Notes:**
- All development should happen on `master` or feature branches off `master`
- Do NOT use the old feature branches (`claude/explore-mobile-development-aPPqT`, etc.)
- Environment: `.env` files needed for backend (copy from `.env.example`)
- Supabase credentials required to run backend

### Next Steps

- [ ] Deploy backend (Railway, Vercel, or custom server)
- [ ] Update mobile API calls to use real backend
- [ ] Test end-to-end
- [ ] Add more endpoints as needed
- [ ] Build for Android/iOS stores

### Testing

**Mobile Web Testing:**
```bash
cd mobile
npm start
# Press 'w' for web
```

**Backend Testing:**
```bash
cd backend
npm start
# Runs on http://localhost:3000
```

---

**Last Updated:** March 27, 2026
**Status:** PoC Complete ✅
