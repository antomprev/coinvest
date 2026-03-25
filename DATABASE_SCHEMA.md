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

### 3. `payments`
Tracks all payment transactions (registration fee, per-idea fee, meeting fees, etc.).

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_type VARCHAR(100) NOT NULL CHECK (payment_type IN (
    'registration_fee',
    'idea_fee',
    'meeting_consultation_fee',
    'negotiation_activation_fee'
  )),
  related_idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL, -- for idea_fee
  related_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL, -- for meeting_consultation_fee
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id VARCHAR(255), -- Stripe transaction ID (for future integration)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `user_id` – user making the payment
- `payment_type` – which fee (registration, per-idea, etc.)
- `related_idea_id`, `related_meeting_id` – context (which idea/meeting this payment is for)
- `amount` – payment amount
- `currency` – currency code (default EUR)
- `status` – 'pending' (awaiting processing), 'completed', 'failed', 'refunded'
- `stripe_payment_id` – Stripe transaction ID (for Phase 5)
- `created_at`, `updated_at` – timestamps

**Notes:**
- **For MVP:** Payments are mocked; we just create records with `status='completed'` to simulate payment.
- **Registration fee:** Created when user signs up (one-time).
- **Per-idea fee:** Created each time an Idea Holder creates an extra idea (after the 1st idea).
- **Future fees** (meeting, negotiation) are added in Phase 5.
- Actual Stripe integration happens in Phase 5.

---

### 4. `subscriptions`
Tracks subscription plan and status (for future tier-based subscriptions in Phase 5).

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
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
- `plan` – current plan tier ('free' for MVP, upgradeable later)
- `status` – 'active' or 'inactive'
- `stripe_customer_id` – Stripe customer ID (for Phase 5)
- `current_period_start`, `current_period_end` – subscription period
- `created_at`, `updated_at` – timestamps

**Notes:**
- **For MVP:** All users start on 'free' plan.
- Individual payments (registration, per-idea) are tracked in the `payments` table.
- Tier-based subscriptions (if implemented) will update this table in Phase 5.

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
  idea_holder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 60,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  )),
  meeting_room_link VARCHAR(500), -- Daily.co room URL
  meeting_room_type VARCHAR(50) DEFAULT 'daily_co',
  created_by_admin UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `idea_id` – the idea being pitched
- `idea_holder_id` – the Idea Holder presenting (denormalized for easier querying)
- `investor_id` – the Investor attending (for 1:1 meetings; for group meetings, see `meeting_attendees`)
- `scheduled_at` – meeting start time
- `duration_minutes` – meeting length (default 60 min)
- `status` – 'scheduled' → 'in_progress' → 'completed' or 'cancelled'
- `meeting_room_link` – Daily.co room URL (generated when meeting is created)
- `meeting_room_type` – provider type (default 'daily_co')
- `created_by_admin` – admin user who scheduled the meeting
- `created_at`, `updated_at` – timestamps

**Notes:**
- Only admins create meetings (no self-scheduling).
- `idea_holder_id` and `investor_id` are denormalized in the `meetings` table for easier filtering and RLS policies.
- `meeting_attendees` table still exists to support **multiple investors** in a single meeting (many-to-many).
- For **1:1 meetings** (one investor, one idea holder), those are the only attendees.
- Meeting room link is generated via Daily.co API when the meeting is created.
- **RLS Policy:** Only the idea_holder_id, investor_id, and admins can see/join this meeting.

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

### 2. **After Questionnaire → NDA + Non-Circumvention Checkbox (BEFORE Admin Review)**
**When:** User fills questionnaire and is about to submit
**Checkbox:** "I accept the NDA and Non-Circumvention Agreement to protect confidentiality and platform integrity"
**Action:** Record in `agreements` table with `agreement_type='nda_non_circumvention'` and `status='agreed'`
**Block:** Questionnaire cannot be submitted until checked
**Note:** This happens before the admin sees the questionnaire, so the admin knows the user is committing to confidentiality before the admin reviews the content.

### 3. **After Questionnaire Submission → Questionnaire Acceptance Checkbox**
**When:** User submits questionnaire with NDA already signed
**Checkbox:** "I accept that my questionnaire information will be reviewed by the platform admin for screening and matching"
**Action:** Record in `agreements` table with `agreement_type='questionnaire_acceptance'` and `status='agreed'`
**Block:** Questionnaire cannot be submitted until checked
**Note:** Confirms user allows admin to review their questionnaire content.

### 4. **Before Pitch Meeting → Introduction / Consulting Agreement Checkbox**
**When:** Admin schedules a meeting (attendees are notified)
**Checkbox:** "I accept the Introduction and Consulting Agreement for this pitch meeting"
**Action:** Record in `agreements` table with `agreement_type='intro_consulting'` and `status='agreed'`
**Block:** Attendee cannot join the meeting room until checked
**Note:** This is done per-meeting (not once globally).

---

## Table Relationships & Data Flow

### Meetings ↔ Meeting Attendees ↔ Messages

**Structure:**
- `meetings` table stores the basic meeting info (idea, idea_holder, investor, scheduled_at, status, room_link)
- `meeting_attendees` is a **many-to-many join table** linking users to meetings (supports multiple investors in one meeting)
- `messages` table stores chat messages; sender_id references the user, meeting_id references the meeting

**Example Flow:**
1. Admin creates a meeting: `INSERT INTO meetings (idea_id, idea_holder_id, investor_id, scheduled_at, ...)`
2. Admin adds attendees: `INSERT INTO meeting_attendees (meeting_id, user_id, role)` for each investor + idea holder
3. Users send chat messages: `INSERT INTO messages (meeting_id, sender_id, content)`
4. RLS policy ensures only meeting attendees can read/write messages for that meeting

**Benefits:**
- `meetings` table has idea_holder_id and investor_id for quick filtering (e.g., "show all meetings for user X")
- `meeting_attendees` supports **both 1:1 and 1:many** meeting scenarios
- `messages` are scoped to meeting_id, so RLS policies can be simple (check meeting membership)

---

## RLS (Row-Level Security) Policies – SQL Examples

### 1. `users` table – Users can read their own profile

```sql
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "admin_read_all_users" ON users
  FOR SELECT
  USING (auth.role() = 'admin');
```

### 2. `ideas` table – Idea Holders see only their own; Investors see approved pool

```sql
CREATE POLICY "idea_holders_read_own_ideas" ON ideas
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'investor')
      AND status = 'screened'
    )
  );

CREATE POLICY "admin_read_all_ideas" ON ideas
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "idea_holders_create_ideas" ON ideas
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'idea_holder')
  );
```

### 3. `messages` table – Only meeting attendees can read/write

```sql
CREATE POLICY "meeting_attendees_read_messages" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meeting_attendees
      WHERE meeting_attendees.meeting_id = messages.meeting_id
      AND meeting_attendees.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_attendees_send_messages" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM meeting_attendees
      WHERE meeting_attendees.meeting_id = messages.meeting_id
      AND meeting_attendees.user_id = auth.uid()
    )
  );
```

### 4. `meetings` table – Only attendees, idea_holder, and admin can see

```sql
CREATE POLICY "meeting_participants_read" ON meetings
  FOR SELECT
  USING (
    auth.uid() = idea_holder_id
    OR auth.uid() = investor_id
    OR EXISTS (
      SELECT 1 FROM meeting_attendees
      WHERE meeting_attendees.meeting_id = meetings.id
      AND meeting_attendees.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

### 5. `task_votes` table – Investors vote on their own; Idea Holder reads all

```sql
CREATE POLICY "investor_vote" ON task_votes
  FOR INSERT
  WITH CHECK (
    investor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'investor')
  );

CREATE POLICY "idea_holder_read_votes" ON task_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN ideas i ON t.idea_id = i.id
      WHERE t.id = task_votes.task_id
      AND i.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

**Notes:**
- RLS policies are **additive** – if ANY policy matches, the operation is allowed
- `auth.uid()` is Supabase's built-in function to get the current user's ID
- `auth.role()` can be used but typically we check `users.role` instead for flexibility
- Admins can be given full access or specific access (we give full access here for MVP)

---

## Design Decisions & Clarifications

### No Separate "Roles" Table
- **Why?** Roles are stored directly in `users.role` as an enum ('idea_holder', 'investor', 'admin')
- For MVP, this is simpler and sufficient. We don't need role permissions/inheritance.
- If complex permission logic is needed later (Phase 5+), a separate `roles` + `role_permissions` table can be added.

### Subscriptions vs Payments
- **`subscriptions` table:** Tracks user's plan tier ('free', 'basic', 'pro') for future tier-based subscriptions (Phase 5)
- **`payments` table:** Tracks individual transactions (registration fee, per-idea fee, etc.) – this is what MVP uses
- For MVP, all users are on 'free' plan, but we record each payment transaction in `payments`

### Denormalization for Performance
- `ideas.view_count`, `like_count`, `pitch_request_count` are denormalized (updated via triggers or application logic)
- `meetings.idea_holder_id` and `meetings.investor_id` are denormalized (also in `meeting_attendees`) for easier filtering and RLS
- This avoids expensive COUNT(*) or JOIN queries on mobile app

### Timestamps
- All tables have `created_at` and `updated_at` (except `likes`, `favorites`, `meeting_attendees`, which only have `created_at`)
- `updated_at` is useful for tracking changes and last-modified timestamps

### Cascade Deletes
- When a user is deleted, all their related records (ideas, requests, votes, messages, etc.) are deleted via CASCADE
- When an idea is deleted, all related records (meetings, messages, notes, etc.) are deleted via CASCADE

### Unique Constraints
- Help maintain data integrity:
  - One questionnaire per user
  - One pitch request per investor per idea
  - One like/favorite per investor per idea
  - One vote per investor per task
  - One subscription per user

### Phase 5 Extensions
- Legal Advisor role (currently manual, outside app)
- Negotiation workspace + documents table
- Real Stripe subscription + webhook handling
- Audit logs (track user actions)
- User blocking/suspending
- Agreement e-signature integration (DocuSign, HelloSign)

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
