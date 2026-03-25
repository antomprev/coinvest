# Technical Architecture – Coinvest Platform

## English Version

### Overview
The platform is built as a React Native + Expo mobile app using Expo Router for file-based navigation and TypeScript for type safety. The backend is implemented with Supabase (PostgreSQL + Auth) or a custom Node.js API.

### User Roles & Authentication
During signup, users self-declare whether they are an **Idea Holder** or an **Investor**. This choice is stored in the database as a `role` field on the `users` table. The application uses this role to control which dashboards and features the user can access. Administrators may later review and confirm these roles, but the initial classification is user-driven.

**Flow:**
1. User registers → declares role (Idea Holder / Investor)
2. User pays subscription (Stripe / Paddle integration)
3. User completes questionnaire (idea description, budget, preferences, etc.)
4. Admin reviews and may approve/reject (vetting process)
5. Approved users access their role-specific dashboard

### Expo Go Setup & Project Structure
The project is initialized with `expo init` using the managed workflow and Expo Router. The folder structure under `src/app/` includes:

```
src/app/
├── _layout.tsx              # Root layout with auth guard
├── auth/
│   ├── login.tsx
│   ├── signup.tsx
│   └── role-selection.tsx
├── (dashboard)/
│   ├── idea-holder/
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Dashboard home
│   │   └── ideas/[id].tsx   # Idea detail + stats
│   ├── investor/
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Ideas pool
│   │   └── pitch-requests.tsx
│   ├── meetings/
│   │   ├── [id].tsx         # Meeting detail + video/chat
│   │   └── calendar.tsx
│   └── _layout.tsx          # Shared dashboard layout
├── admin/
│   ├── vetting.tsx          # Approve/reject users
│   └── monitoring.tsx       # Progress tracking
└── (public)/
    └── questionnaire.tsx    # Pre-auth form
```

### Navigation Strategy
Navigation is based on **Expo Router** (file-based routing):
- **Stack navigation** for linear flows (auth, questionnaires)
- **Tab navigation** for dashboard sections (home, meetings, profile)
- **Auth guard middleware** checks user session and role, redirecting to appropriate dashboard
- **Deep linking** support for meeting invites and notifications

### State Management
- **Global UI State** (current user, selected filters): **Zustand** or **Jotai**
  - Lightweight, TypeScript-friendly, minimal boilerplate
- **Server State** (ideas list, pitch requests, meetings, feedback): **TanStack Query (React Query)**
  - Automatic caching, refetching, optimistic updates
  - Syncs with backend via API endpoints

### Backend / API Needs

#### Core Endpoints:
1. **Auth**
   - `POST /auth/signup` → register user, assign role
   - `POST /auth/login` → email + password
   - `POST /auth/logout`
   - `GET /auth/me` → current user with role

2. **Ideas**
   - `POST /ideas` → create new idea (Idea Holder only)
   - `GET /ideas` → list all ideas (public or filtered for investors)
   - `GET /ideas/:id` → idea detail + view/like counts
   - `PUT /ideas/:id` → update idea (owner only)

3. **Pitch Requests**
   - `POST /ideas/:id/pitch-requests` → investor requests pitch (Investor only)
   - `GET /ideas/:id/pitch-requests` → list requests for idea (Idea Holder only)
   - `PUT /pitch-requests/:id/status` → accept / reject request

4. **Meetings**
   - `POST /meetings` → create meeting (when enough pitch requests gathered)
   - `GET /meetings/:id` → meeting detail, participants, status
   - `GET /meetings/:id/slots` → available time slots
   - `PUT /meetings/:id/slots/:slotId/status` → accept / reject slot

5. **Chat / Messaging**
   - `GET /meetings/:id/messages` → list messages in meeting
   - `POST /meetings/:id/messages` → send message
     - Backend validates: sender is participant AND (Idea Holder OR message is not 1:1)
     - Prevents 1:1 investor-to-investor chats unless Idea Holder present

6. **Feedback**
   - `POST /meetings/:id/feedback` → submit feedback / vote after meeting
   - `GET /meetings/:id/feedback` → list all feedback
   - `PUT /meetings/:id/status` → mark as "next phase" if all feedback positive

7. **Payments / Subscriptions**
   - `POST /subscriptions` → activate subscription (Stripe webhook handling)
   - `GET /subscriptions` → user's subscription status

### Data Storage

#### Database Tables (PostgreSQL):

```sql
users
  id, email, password_hash, role (idea_holder | investor),
  subscription_status, profile_data, created_at

ideas
  id, owner_id (FK users), title, description, budget,
  view_count, like_count, created_at

pitch_requests
  id, idea_id (FK ideas), investor_id (FK users),
  status (pending | accepted | rejected), created_at

meetings
  id, idea_id (FK ideas), status (scheduled | in_progress | completed),
  created_at, started_at, ended_at

meeting_attendees
  meeting_id (FK meetings), user_id (FK users), role (idea_holder | investor)

feedback
  id, meeting_id (FK meetings), investor_id (FK users),
  vote (yes | no | undecided), comments, created_at

messages
  id, meeting_id (FK meetings), sender_id (FK users),
  content, created_at

subscriptions
  id, user_id (FK users), plan, status, stripe_id, expires_at
```

#### Security:
- **Row-Level Security (RLS)** enforces that:
  - Users only see ideas they own or are marketed to them
  - Chat messages are only visible to meeting participants
  - Feedback is visible only to meeting participants
  - Investors cannot message each other 1:1 in a meeting unless the Idea Holder is present

#### Offline & Caching:
- **AsyncStorage** for local user session and preferences
- **TanStack Query** caching for lists and ideas
- If needed: **SQLite** for offline idea drafts (sync on reconnect)

---

## Ελληνική Έκδοση (Greek Version)

### Επισκόπηση
Η πλατφόρμα είναι κατασκευασμένη ως εφαρμογή React Native + Expo με Expo Router για διαδρομή βασισμένη σε αρχεία και TypeScript για ασφάλεια τύπου. Το backend υλοποιείται με Supabase (PostgreSQL + Auth) ή ένα προσαρμοσμένο Node.js API.

### Ρόλοι Χρήστη & Ταυτοποίηση
Κατά την εγγραφή, οι χρήστες δηλώνουν ότι είναι είτε **Κάτοχος Ιδέας** είτε **Επενδυτής**. Αυτή η επιλογή αποθηκεύεται στη βάση δεδομένων ως πεδίο `role` στον πίνακα `users`. Η εφαρμογή χρησιμοποιεί αυτόν τον ρόλο για να ελέγχει ποια dashboards και λειτουργίες μπορεί να προσπελάσει ο χρήστης. Οι διαχειριστές μπορεί να επαληθεύσουν αυτούς τους ρόλους αργότερα, αλλά η αρχική ταξινόμηση είναι καθορισμένη από το χρήστη.

**Ροή:**
1. Χρήστης εγγράφεται → δηλώνει ρόλο (Κάτοχος Ιδέας / Επενδυτής)
2. Χρήστης πληρώνει συνδρομή (ολοκλήρωση Stripe / Paddle)
3. Χρήστης συμπληρώνει ερωτηματολόγιο (περιγραφή ιδέας, προϋπολογισμό, προτιμήσεις κ.λπ.)
4. Διαχειριστής επιθεωρεί και ενδέχεται να εγκρίνει/απορρίψει (διαδικασία ελέγχου)
5. Εγκεκριμένοι χρήστες αποκτούν πρόσβαση στο dashboard του ρόλου τους

### Εγκατάσταση Expo & Δομή Έργου
Το έργο αρχικοποιείται με `expo init` χρησιμοποιώντας τον διαχειριζόμενο workflow και Expo Router. Η δομή φακέλων κάτω από `src/app/` περιλαμβάνει:

```
src/app/
├── _layout.tsx              # Root layout με guards
├── auth/
│   ├── login.tsx
│   ├── signup.tsx
│   └── role-selection.tsx
├── (dashboard)/
│   ├── idea-holder/
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Dashboard αρχική σελίδα
│   │   └── ideas/[id].tsx   # Λεπτομέρεια ιδέας + στατιστικά
│   ├── investor/
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Πιθιότητα ιδεών
│   │   └── pitch-requests.tsx
│   ├── meetings/
│   │   ├── [id].tsx         # Λεπτομέρεια συνάντησης + chat
│   │   └── calendar.tsx
│   └── _layout.tsx          # Κοινό dashboard layout
├── admin/
│   ├── vetting.tsx          # Έγκριση/απόρριψη χρηστών
│   └── monitoring.tsx       # Παρακολούθηση προόδου
└── (public)/
    └── questionnaire.tsx    # Φόρμα πριν από auth
```

### Στρατηγική Πλοήγησης
Η πλοήγηση βασίζεται σε **Expo Router** (διαδρομή βασισμένη σε αρχεία):
- **Stack navigation** για γραμμικές ροές (auth, ερωτηματολόγια)
- **Tab navigation** για ενότητες dashboard (αρχική σελίδα, συνάντησες, προφίλ)
- **Auth guard middleware** ελέγχει τη συνεδρία και τον ρόλο του χρήστη, ανακατευθύνοντας στο κατάλληλο dashboard
- Υποστήριξη **deep linking** για προσκλήσεις συνάντησης και ειδοποιήσεις

### Διαχείριση Κατάστασης
- **Global UI State** (τρέχων χρήστης, επιλεγμένα φίλτρα): **Zustand** ή **Jotai**
  - Ελαφρύ, ασφαλές σε TypeScript, ελάχιστο boilerplate
- **Server State** (λίστα ιδεών, pitch requests, συνάντησες, ανατροφοδότηση): **TanStack Query (React Query)**
  - Αυτόματη αποθήκευση σε cache, ανανέωση, αισιόδοξες ενημερώσεις
  - Συγχρονισμός με backend μέσω API endpoints

### Ανάγκες Backend / API

#### Κύρια Endpoints:
1. **Auth**
   - `POST /auth/signup` → εγγραφή χρήστη, ανάθεση ρόλου
   - `POST /auth/login` → email + password
   - `POST /auth/logout`
   - `GET /auth/me` → τρέχων χρήστης με ρόλο

2. **Ideas**
   - `POST /ideas` → δημιουργία νέας ιδέας (μόνο Κάτοχος Ιδέας)
   - `GET /ideas` → λίστα όλων των ιδεών (δημόσιες ή φιλτραρισμένες για επενδυτές)
   - `GET /ideas/:id` → λεπτομέρεια ιδέας + μετρήσεις προβολών/αρεσκειών
   - `PUT /ideas/:id` → ενημέρωση ιδέας (μόνο ιδιοκτήτης)

3. **Pitch Requests**
   - `POST /ideas/:id/pitch-requests` → επενδυτής ζητάει pitch (μόνο Επενδυτής)
   - `GET /ideas/:id/pitch-requests` → λίστα requests για ιδέα (μόνο Κάτοχος Ιδέας)
   - `PUT /pitch-requests/:id/status` → αποδοχή / απόρριψη request

4. **Meetings**
   - `POST /meetings` → δημιουργία συνάντησης (όταν συγκεντρωθούν αρκετά pitch requests)
   - `GET /meetings/:id` → λεπτομέρεια συνάντησης, συμμετέχοντες, κατάσταση
   - `GET /meetings/:id/slots` → διαθέσιμες σχισμές ώρας
   - `PUT /meetings/:id/slots/:slotId/status` → αποδοχή / απόρριψη σχισμής

5. **Chat / Messaging**
   - `GET /meetings/:id/messages` → λίστα μηνυμάτων στη συνάντηση
   - `POST /meetings/:id/messages` → αποστολή μηνύματος
     - Το backend επικυρώνει: ο αποστολέας είναι συμμετέχων ΚΑΙ (Κάτοχος Ιδέας ΑΠΟ το μήνυμα δεν είναι 1:1)
     - Αποτρέπει τα μηνύματα 1:1 μεταξύ επενδυτών εκτός εάν ο Κάτοχος Ιδέας είναι παρών

6. **Feedback**
   - `POST /meetings/:id/feedback` → υποβολή ανατροφοδότησης / ψήφου μετά τη συνάντηση
   - `GET /meetings/:id/feedback` → λίστα όλης της ανατροφοδότησης
   - `PUT /meetings/:id/status` → σήμανση ως "επόμενη φάση" εάν όλη η ανατροφοδότηση είναι θετική

7. **Πληρωμές / Συνδρομές**
   - `POST /subscriptions` → ενεργοποίηση συνδρομής (χειρισμός Stripe webhook)
   - `GET /subscriptions` → κατάσταση συνδρομής χρήστη

### Αποθήκευση Δεδομένων

#### Πίνακες Βάσης Δεδομένων (PostgreSQL):

```sql
users
  id, email, password_hash, role (idea_holder | investor),
  subscription_status, profile_data, created_at

ideas
  id, owner_id (FK users), title, description, budget,
  view_count, like_count, created_at

pitch_requests
  id, idea_id (FK ideas), investor_id (FK users),
  status (pending | accepted | rejected), created_at

meetings
  id, idea_id (FK ideas), status (scheduled | in_progress | completed),
  created_at, started_at, ended_at

meeting_attendees
  meeting_id (FK meetings), user_id (FK users), role (idea_holder | investor)

feedback
  id, meeting_id (FK meetings), investor_id (FK users),
  vote (yes | no | undecided), comments, created_at

messages
  id, meeting_id (FK meetings), sender_id (FK users),
  content, created_at

subscriptions
  id, user_id (FK users), plan, status, stripe_id, expires_at
```

#### Ασφάλεια:
- **Row-Level Security (RLS)** επιβάλλει ότι:
  - Οι χρήστες βλέπουν μόνο τις ιδέες που κατέχουν ή τους προορίζονται
  - Τα μηνύματα chat είναι ορατά μόνο στους συμμετέχοντες της συνάντησης
  - Η ανατροφοδότηση είναι ορατή μόνο στους συμμετέχοντες της συνάντησης
  - Οι επενδυτές δεν μπορούν να στείλουν μηνύματα ο ένας στον άλλον 1:1 σε μια συνάντηση εκτός εάν ο Κάτοχος Ιδέας είναι παρών

#### Offline & Caching:
- **AsyncStorage** για τοπική συνεδρία χρήστη και προτιμήσεις
- **TanStack Query** caching για λίστες και ιδέες
- Εάν χρειάζεται: **SQLite** για σχέδια ιδεών offline (συγχρονισμός κατά την επανασύνδεση)
