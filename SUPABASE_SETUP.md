# Supabase Setup Guide – Coinvest MVP

This guide walks you through setting up Supabase for the Coinvest platform.

## Step 1: Create a Supabase Account & Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name:** `coinvest-mvp` (or your preference)
   - **Database Password:** Create a strong password (you'll need this later)
   - **Region:** Choose the closest to your users (e.g., `eu-west-1` for Europe)
5. Click **"Create new project"**
6. Wait for the project to initialize (2-5 minutes)

## Step 2: Get Your Project Credentials

Once the project is ready:

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values (you'll need them for your app):
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **API Key (anon/public)** – for frontend access
   - **API Key (service_role)** – for backend (keep secret!)

3. Save these in a `.env.local` file (don't commit):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx
   ```

## Step 3: Run the Database Migration

### Option A: Using Supabase Studio (Easiest)

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire content of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click **"Run"** (top right)
6. Wait for all statements to complete (you'll see green checkmarks)

### Option B: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your_project_id

# Run migrations
supabase db push
```

## Step 4: Verify Tables & RLS Policies

1. Go to **Table Editor** (left sidebar)
2. You should see all 17 tables:
   - users, questionnaires, payments, subscriptions
   - ideas, pitch_requests, likes, favorites
   - meetings, chat_rooms, chat_room_attendees, messages
   - notes, agreements, tasks, task_votes, notifications

3. Click on each table to verify columns are correct

4. Go to **Authentication** (left sidebar) to verify RLS is enabled:
   - Each table should show "RLS is on" with a toggle
   - Click into each table to see RLS policies

## Step 5: Enable Supabase Auth (Optional but Recommended)

1. Go to **Authentication** → **Providers** (left sidebar)
2. Enable **Email** provider (enabled by default)
3. Optional: Enable other providers (Google, GitHub, etc.)

4. Go to **Authentication** → **Email Templates**
5. Customize email templates if desired (optional for MVP)

## Step 6: Test Connection

Create a simple test script to verify the connection works:

**Node.js / Express:**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test: Get all users
supabase
  .from('users')
  .select('*')
  .then(({ data, error }) => {
    if (error) console.error('Error:', error);
    else console.log('Success! Users:', data);
  });
```

**React Native / Expo:**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Test in an effect
useEffect(() => {
  supabase
    .from('users')
    .select('*')
    .then(({ data, error }) => {
      if (error) console.error('Error:', error);
      else console.log('Success! Users:', data);
    });
}, []);
```

## Step 7: Understand RLS Policies

**Important:** All tables have Row-Level Security (RLS) enabled. This means:

- **Users can only see their own data** (unless they're an admin)
- **Investors can only see "screened" ideas** (not all ideas)
- **Chatroom participants can only see messages in their chatroom**
- **Admins can see everything**

When testing:
- Use the **anon key** (frontend) to test user access
- Use the **service_role key** (backend) to bypass RLS (careful!)
- In Supabase Studio, you can test RLS by impersonating a user

## Step 8: Set Up Profiles/Metadata (Optional)

To store additional user info (name, avatar, etc.), you can:

1. Go to **SQL Editor**
2. Run this query to extend the `users` table:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
```

Or create a separate `profiles` table (more flexible).

## Common Issues & Troubleshooting

### "Permission denied" errors
- Check RLS policies are enabled (`SELECT * FROM auth.users()`)
- Verify the user is logged in (has valid JWT token)
- Use service_role key for admin operations (bypasses RLS)

### "Relation does not exist"
- Verify migration ran successfully (check SQL Editor logs)
- Refresh your browser
- Check table names match (PostgreSQL is case-sensitive for unquoted names)

### Foreign key constraint violations
- Insert parent records first (e.g., users before ideas)
- Check referential integrity (IDs must exist in parent table)

### RLS too restrictive
- If testing and RLS is blocking everything, temporarily disable RLS:
  ```sql
  ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
  ```
- Re-enable when done: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`

## Next Steps

Once Supabase is set up:

1. **Design API Endpoints** – List all endpoints (CRUD + business logic)
2. **Build Backend** – Use Supabase Edge Functions or a custom API (Node.js, Python, etc.)
3. **Build Mobile App** – Use Expo + React Native
4. **Connect Everything** – Integrate mobile app with your API

---

## Useful Supabase Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

Ready to test? Let me know when Supabase is set up, and we'll move to **API Endpoint Design**! 🚀
