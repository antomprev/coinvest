# Coinvest Database Schema – MVP Phase 4

## Overview
This document defines the PostgreSQL schema for the Coinvest platform MVP. The database is hosted on **Supabase** with **Row-Level Security (RLS)** policies to enforce access control.

---

## Core Tables

### 1. `users`
Stores all platform users (Idea Holders, Investors, Admins).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('idea_holder', 'investor', 'admin')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id` – unique identifier
- `email` – login email
- `password_hash` – hashed password (handled by Supabase Auth)
- `role` – self-declared by user at signup; admin approves but does NOT change it
- `status` – approval status ('pending' until admin reviews, then 'approved' or 'rejected')
- `created_at`, `updated_at` – timestamps

**Notes:**
- Supabase Auth will handle password management; we store user metadata here.
- `status` = 'pending' means waiting for admin review.
- `status` = 'approved' means the user can access the platform.
- `status` = 'rejected' means admin declined the questionnaire/signup.

---

### 2. `questionnaires`
Stores questionnaire responses per user (different per role).

```sql
CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('idea_holder', 'investor')),
  responses JSONB NOT NULL, -- flexible schema: {field1, field2, ...}
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Fields:**
- `user_id` – reference to the user
- `role` – mirrors the role from `users` table (for clarity)
- `responses` – JSONB object storing all questionnaire answers
  - **For Idea Holders:**
    - `idea_title`, `idea_description`, `target_audience`, `stage`, `funding_requested`, etc.
  - **For Investors:**
    - `investment_range`, `preferred_sectors`, `risk_profile`, `ticket_size`, etc.
- `submitted_at` – when the questionnaire was first submitted
- `updated_at` – when it was last updated

**Notes:**
- JSONB allows flexibility; we can add new fields without schema migration.
- One questionnaire per user (enforced by UNIQUE constraint).
- Admin reviews `responses` to approve/reject the user.

---

### 3. `subscriptions`
Tracks subscription and payment status for users.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
  stripe_customer_id VARCHAR(255), -- Stripe customer ID (for future integration)
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Fields:**
- `user_id` – the subscriber
- `plan` – current plan tier (for future use; all users start on 'free')
- `status` – 'active' = paid, 'inactive' = unpaid/free
- `stripe_customer_id` – for future Stripe integration
- `current_period_start`, `current_period_end` – subscription period
- `created_at`, `updated_at` – timestamps

**Notes:**
- **For MVP:** We track subscriptions in DB but mock payments.
- **Registration fee:** User pays when signing up (mocked for now).
- **Per-idea fee:** User pays when creating extra ideas (mocked for now).
- Actual Stripe integration happens in Phase 5.

---

### 4. `ideas`
Stores ideas created by Idea Holders.

```sql
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  stage VARCHAR(100), -- e.g., "Ideation", "MVP", "Traction", "Growth"
  target_audience VARCHAR(255),
  funding_requested NUMERIC,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'screened',
    'in_screening',
    'meeting_scheduled',
    'meeting_done',
    'next_step_pending',
    'rejected'
  )),
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  pitch_request_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, title) -- one title per owner
);
```

**Fields:**
- `owner_id` – Idea Holder who created this idea
- `title`, `description`, `stage`, `target_audience`, `funding_requested` – idea details
- `status` – lifecycle stage of the idea
  - 'submitted' → admin screening
  - 'screened' → enters pool for investors
  - 'in_screening' → admin reviewing
  - 'meeting_scheduled' → investors matched, meeting scheduled
  - 'meeting_done' → meeting completed, waiting for next step vote
  - 'next_step_pending' → votes collected, ready for next phase
  - 'rejected' → admin rejected
- `view_count`, `like_count`, `pitch_request_count` – stats (denormalized for performance)
- `created_at`, `updated_at` – timestamps

**Notes:**
- Idea Holders can only see their own ideas (enforced by RLS).
- Status transitions trigger notifications.

---

### 5. `pitch_requests`
Investors requesting a pitch meeting with an Idea Holder.

```sql
CREATE TABLE pitch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, investor_id) -- one request per investor per idea
);
```

**Fields:**
- `idea_id`, `investor_id` – the idea and the investor requesting
- `status` – 'pending' (awaiting admin/idea holder), 'accepted' (approved), 'rejected' (declined)
- `created_at`, `updated_at` – timestamps

**Notes:**
- When an investor clicks "Request Pitch", a record is inserted here.
- Admin sees all requests and can schedule meetings once enough requests exist.
- Idea Holder sees all requests but doesn't approve individually (admin does).

---

### 6. `likes`
Investors marking ideas as "liked" without requesting a pitch.

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, investor_id) -- one like per investor per idea
);
```

**Fields:**
- `idea_id`, `investor_id` – the idea and the investor liking it
- `created_at` – timestamp

**Notes:**
- Like ≠ Pitch Request. An investor can like an idea without committing to a meeting.
- `ideas.like_count` is denormalized; we keep this table for querying individual likes.
- Idea Holder sees "3 likes, 1 pitch request" → signal that something might be missing.

---

### 7. `favorites`
Investors saving ideas to a favorites list for later review.

```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, investor_id) -- one favorite per investor per idea
);
```

**Fields:**
- `idea_id`, `investor_id` – the idea and the investor saving it
- `created_at` – timestamp

**Notes:**
- Investor can quickly return to saved ideas.
- Can be the same as `likes` table or separate; for MVP, we keep both for flexibility.

---

### 8. `meetings`
Scheduled pitch meetings between Idea Holder(s) and Investor(s).

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 60,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  )),
  meeting_room_link VARCHAR(500), -- Zoom / Daily.co room URL
  meeting_room_type VARCHAR(50), -- 'daily_co', 'zoom', 'custom'
  created_by_admin UUID REFERENCES users(id), -- admin who created the meeting
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `idea_id` – the idea being pitched
- `scheduled_at` – meeting start time
- `duration_minutes` – meeting length (default 60 min)
- `status` – 'scheduled' → 'in_progress' → 'completed' or 'cancelled'
- `meeting_room_link` – Zoom/Daily.co URL (generated when meeting is created)
- `meeting_room_type` – which provider
- `created_by_admin` – admin user who scheduled the meeting
- `created_at`, `updated_at` – timestamps

**Notes:**
- Only admins create meetings (no self-scheduling).
- Meeting room link is generated via Daily.co API when the meeting is created.
- Idea Holder + matching investors are added to `meeting_attendees` table.

---

### 9. `meeting_attendees`
Join table linking users to meetings.

```sql
CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('idea_holder', 'investor')),
  status VARCHAR(50) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'attended')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(meeting_id, user_id) -- one attendee record per user per meeting
);
```

**Fields:**
- `meeting_id`, `user_id` – meeting and attendee
- `role` – 'idea_holder' or 'investor'
- `status` – 'invited' (default), 'accepted', 'declined', 'attended'
- `created_at` – timestamp

**Notes:**
- Admin adds attendees when creating the meeting.
- Attendees receive notifications about the meeting.
- Investors can only join if they're in this table.

---

### 10. `messages`
Chat messages for group discussions within a meeting.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `meeting_id` – the meeting group chat
- `sender_id` – the user sending the message
- `content` – message text
- `created_at` – timestamp

**Notes:**
- Messages are scoped to a meeting (and thus to the idea + matching participants).
- RLS policy: Only meeting attendees can read/write messages.
- No 1:1 investor-to-investor chats (enforced by RLS or app logic).

---

### 11. `agreements`
Tracks which agreements each user has signed/accepted (via checkboxes).

```sql
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agreement_type VARCHAR(100) NOT NULL CHECK (agreement_type IN (
    'platform_terms',
    'questionnaire_acceptance',
    'nda_non_circumvention',
    'intro_consulting'
  )),
  version VARCHAR(50) DEFAULT '1.0', -- track agreement version
  agreed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'agreed', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, agreement_type, version) -- one record per user per agreement version
);
```

**Fields:**
- `user_id` – the user
- `agreement_type` – which agreement (see MVP checkboxes below)
- `version` – agreement version (for tracking updates)
- `agreed_at` – when the user checked "I agree"
- `status` – 'pending' (not yet agreed), 'agreed' (checkbox checked), 'rejected' (user declined)
- `created_at`, `updated_at` – timestamps

**Notes:**
- Simple agreement tracking without e-signature.
- We just record: user ID + agreement type + checkbox status + timestamp.

---

### 12. `notes`
Notes / decisions for each idea (shared among Idea Holder + matching investors).

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `idea_id` – the idea these notes belong to
- `created_by_user_id` – who wrote the note (Idea Holder or matching investor)
- `content` – note text
- `created_at`, `updated_at` – timestamps

**Notes:**
- Shared note-taking space per idea.
- Only Idea Holder + matching investors can see/edit notes.
- Enforced by RLS policy.

---

### 13. `tasks`
Post-meeting tasks for investors to vote on advancing to the next phase.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  task_type VARCHAR(100) DEFAULT 'next_step_decision' CHECK (task_type IN ('next_step_decision', 'other')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `meeting_id` – associated meeting
- `idea_id` – associated idea
- `task_type` – type of task (for MVP, only 'next_step_decision')
- `status` – 'open' (waiting for votes), 'completed' (votes collected), 'cancelled'
- `created_at`, `updated_at` – timestamps

**Notes:**
- One task per meeting (created after the meeting is marked as 'completed').
- Investors vote on this task (see `task_votes` table below).

---

### 14. `task_votes`
Individual investor votes on post-meeting tasks.

```sql
CREATE TABLE task_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(50) NOT NULL CHECK (vote IN ('yes', 'no', 'undecided')),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, investor_id) -- one vote per investor per task
);
```

**Fields:**
- `task_id` – the task being voted on
- `investor_id` – the investor voting
- `vote` – 'yes' (advance), 'no' (decline), 'undecided'
- `comments` – optional reasoning
- `created_at`, `updated_at` – timestamps

**Notes:**
- Only investors vote (Idea Holder does NOT vote).
- If at least one investor votes 'yes', the idea is flagged ready for next phase.
- Admin is notified to schedule the next meeting.

---

### 15. `notifications`
Stores all in-app notifications for users.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- 'new_idea', 'pitch_request', 'meeting_scheduled', 'task_assigned', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  related_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `user_id` – recipient
- `type` – notification category
- `title`, `message` – notification content
- `related_idea_id`, `related_meeting_id` – context links
- `read_at` – when user read the notification
- `created_at` – timestamp

**Notes:**
- Simple in-app notification tracking.
- Push notifications (Phase 5) will reference these records.

---

## Enums & Constants

### User Roles
```
'idea_holder' – user with an idea to pitch
'investor'    – user with capital to invest
'admin'       – platform administrator
```

### User Status
```
'pending'   – awaiting admin review
'approved'  – admin approved, user can access platform
'rejected'  – admin rejected, user cannot access platform
```

### Idea Status
```
'submitted'           – user just created idea
'screened'            – admin reviewed, approved (idea in pool)
'in_screening'        – admin is reviewing
'meeting_scheduled'   – investors matched, meeting scheduled
'meeting_done'        – meeting completed, votes pending
'next_step_pending'   – votes collected, ready for admin to schedule next step
'rejected'            – admin rejected idea
```

### Pitch Request Status
```
'pending'   – investor requested, awaiting scheduling
'accepted'  – admin scheduled a meeting
'rejected'  – admin/idea holder declined
```

### Meeting Status
```
'scheduled'    – meeting is scheduled
'in_progress'  – meeting is live
'completed'    – meeting finished, tasks created
'cancelled'    – meeting was cancelled
```

### Agreement Types
```
'platform_terms'       – "I accept the Platform Terms" (signup)
'questionnaire_acceptance' – "I accept to share my questionnaire data" (after questionnaire)
'nda_non_circumvention' – "I accept NDA + Non-Circumvention" (before screening/matching)
'intro_consulting'      – "I accept Introduction/Consulting Agreement" (before pitch meeting)
```

---

## MVP Checkboxes / Agreements Flow

### 1. **Signup → Platform Terms Checkbox**
**When:** User signs up and declares role
**Checkbox:** "I accept the Platform Terms and Services"
**Action:** Record in `agreements` table with `agreement_type='platform_terms'` and `status='agreed'`
**Block:** User cannot proceed until checked

### 2. **After Questionnaire → Questionnaire Acceptance Checkbox**
**When:** User fills questionnaire and submits
**Checkbox:** "I accept to share my questionnaire information with the platform for screening and matching"
**Action:** Record in `agreements` table with `agreement_type='questionnaire_acceptance'` and `status='agreed'`
**Block:** Questionnaire cannot be submitted until checked

### 3. **Before Screening/Matching → NDA + Non-Circumvention Checkbox**
**When:** Admin approves user (user status = 'approved')
**Checkbox:** "I accept the NDA and Non-Circumvention Agreement to protect confidentiality and platform integrity"
**Action:** Record in `agreements` table with `agreement_type='nda_non_circumvention'` and `status='agreed'`
**Block:** User cannot see the pool / dashboard until checked
**Note:** This step happens after admin approves but before the user can interact with the pool.

### 4. **Before Pitch Meeting → Introduction / Consulting Agreement Checkbox**
**When:** Admin schedules a meeting (attendees are notified)
**Checkbox:** "I accept the Introduction and Consulting Agreement for this pitch meeting"
**Action:** Record in `agreements` table with `agreement_type='intro_consulting'` and `status='agreed'`
**Block:** Attendee cannot join the meeting room until checked
**Note:** This is done per-meeting (not once globally).

---

## RLS (Row-Level Security) Policies – Summary

### `users` table
- Users can read their own record
- Admins can read all records

### `ideas` table
- Idea Holders see only their own ideas
- Investors see approved ideas in the pool (via separate table or visibility flag)
- Admins see all ideas

### `pitch_requests` table
- Idea Holders see requests for their ideas
- Investors see their own requests
- Admins see all requests

### `messages` table
- Only meeting attendees can read/write messages
- No 1:1 investor-to-investor chats (enforced by checking meeting attendees)

### `notes` table
- Only Idea Holder + matching investors can read/write
- Admins can read all

### `task_votes` table
- Investors can read/write their own votes
- Idea Holder can read all votes for their idea
- Admins can read all

### Other tables
- Admins can read all
- Users can read their own records (and shared/associated records based on business logic)

---

## Notes

1. **Denormalization for Performance:**
   - `ideas.view_count`, `like_count`, `pitch_request_count` are denormalized (updated via triggers or application logic)
   - This avoids expensive COUNT(*) queries on the mobile app

2. **Timestamps:**
   - All tables have `created_at` and `updated_at` (except `likes`, `favorites`, which only have `created_at`)
   - `updated_at` is useful for tracking changes and conflict resolution

3. **Cascade Deletes:**
   - When a user is deleted, all their related records (ideas, requests, votes, etc.) are deleted
   - When an idea is deleted, all related records (meetings, messages, notes, etc.) are deleted

4. **Unique Constraints:**
   - Help maintain data integrity (e.g., one questionnaire per user, one request per investor per idea)

5. **Phase 5 Extensions:**
   - Legal Advisor role + assignment table
   - Negotiation workspace + documents
   - Real Stripe subscription tracking
   - Audit logs
   - User blocking/suspending

---

## Summary Table

| Table | Purpose | Key Relations |
|-------|---------|---|
| `users` | Platform users (Idea Holders, Investors, Admins) | Primary key for all user-related tables |
| `questionnaires` | User profile questionnaire responses | Linked to `users` |
| `subscriptions` | Subscription & payment status | Linked to `users` |
| `ideas` | Ideas posted by Idea Holders | Linked to `users` (owner) |
| `pitch_requests` | Investor requests to pitch | Linked to `ideas` + `users` (investor) |
| `likes` | Investors liking ideas without pitching | Linked to `ideas` + `users` (investor) |
| `favorites` | Investors saving ideas | Linked to `ideas` + `users` (investor) |
| `meetings` | Scheduled pitch meetings | Linked to `ideas` |
| `meeting_attendees` | Users attending meetings | Linked to `meetings` + `users` |
| `messages` | Chat messages in meetings | Linked to `meetings` + `users` (sender) |
| `notes` | Shared notes per idea | Linked to `ideas` + `users` (creator) |
| `agreements` | Agreement acceptance tracking | Linked to `users` |
| `tasks` | Post-meeting tasks (voting) | Linked to `meetings` + `ideas` |
| `task_votes` | Individual investor votes on tasks | Linked to `tasks` + `users` (investor) |
| `notifications` | In-app notifications | Linked to `users` + `ideas` / `meetings` |

---

## Next Steps

1. **Review & Approve** this schema
2. **Create Supabase Project** and initialize tables
3. **Set up RLS Policies** for each table
4. **Define API Endpoints** (CRUD + business logic)
5. **Build Mobile App** against the API

Ready to proceed?
