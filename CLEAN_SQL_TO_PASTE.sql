-- Coinvest MVP Database Schema
-- Copy and paste this entire content into Supabase SQL Editor

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('idea_holder', 'investor', 'admin')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('idea_holder', 'investor')),
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_questionnaires_user_id ON questionnaires(user_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_type VARCHAR(100) NOT NULL CHECK (payment_type IN ('registration_fee', 'idea_fee', 'meeting_consultation_fee', 'negotiation_activation_fee')),
  related_idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  related_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(payment_type);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  stage VARCHAR(100),
  target_audience VARCHAR(255),
  funding_requested NUMERIC,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'screened', 'in_screening', 'meeting_scheduled', 'meeting_done', 'next_step_pending', 'rejected')),
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  pitch_request_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, title)
);

CREATE INDEX idx_ideas_owner_id ON ideas(owner_id);
CREATE INDEX idx_ideas_status ON ideas(status);

CREATE TABLE pitch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, investor_id)
);

CREATE INDEX idx_pitch_requests_idea_id ON pitch_requests(idea_id);
CREATE INDEX idx_pitch_requests_investor_id ON pitch_requests(investor_id);
CREATE INDEX idx_pitch_requests_status ON pitch_requests(status);

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, investor_id)
);

CREATE INDEX idx_likes_idea_id ON likes(idea_id);
CREATE INDEX idx_likes_investor_id ON likes(investor_id);

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, investor_id)
);

CREATE INDEX idx_favorites_idea_id ON favorites(idea_id);
CREATE INDEX idx_favorites_investor_id ON favorites(investor_id);

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 60,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  meeting_room_link VARCHAR(500),
  meeting_room_type VARCHAR(50) DEFAULT 'daily_co',
  created_by_admin UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_meetings_idea_id ON meetings(idea_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled_at ON meetings(scheduled_at);

CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_by_admin UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_idea_id ON chat_rooms(idea_id);
CREATE INDEX idx_chat_rooms_meeting_id ON chat_rooms(meeting_id);

CREATE TABLE chat_room_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('idea_holder', 'investor', 'admin')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chat_room_id, user_id)
);

CREATE INDEX idx_chat_room_attendees_chat_room_id ON chat_room_attendees(chat_room_id);
CREATE INDEX idx_chat_room_attendees_user_id ON chat_room_attendees(user_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notes_idea_id ON notes(idea_id);
CREATE INDEX idx_notes_created_by_user_id ON notes(created_by_user_id);

CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agreement_type VARCHAR(100) NOT NULL CHECK (agreement_type IN ('platform_terms', 'questionnaire_acceptance', 'nda_non_circumvention', 'intro_consulting')),
  version VARCHAR(50) DEFAULT '1.0',
  agreed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'agreed', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, agreement_type, version)
);

CREATE INDEX idx_agreements_user_id ON agreements(user_id);
CREATE INDEX idx_agreements_type ON agreements(agreement_type);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  task_type VARCHAR(100) DEFAULT 'next_step_decision' CHECK (task_type IN ('next_step_decision', 'other')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_meeting_id ON tasks(meeting_id);
CREATE INDEX idx_tasks_idea_id ON tasks(idea_id);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE TABLE task_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(50) NOT NULL CHECK (vote IN ('yes', 'no', 'undecided')),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, investor_id)
);

CREATE INDEX idx_task_votes_task_id ON task_votes(task_id);
CREATE INDEX idx_task_votes_investor_id ON task_votes(investor_id);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  related_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admin_read_all_users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "idea_holders_read_own_ideas" ON ideas FOR SELECT USING (auth.uid() = owner_id OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'investor') AND status = 'screened'));
CREATE POLICY "admin_read_all_ideas" ON ideas FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "idea_holders_create_ideas" ON ideas FOR INSERT WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'idea_holder'));
CREATE POLICY "idea_holders_update_own_ideas" ON ideas FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "chatroom_participants_read" ON chat_rooms FOR SELECT USING (EXISTS (SELECT 1 FROM chat_room_attendees WHERE chat_room_attendees.chat_room_id = chat_rooms.id AND chat_room_attendees.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_read_own_attendance" ON chat_room_attendees FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_manage_attendees" ON chat_room_attendees FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "chatroom_participants_read_messages" ON messages FOR SELECT USING (EXISTS (SELECT 1 FROM chat_room_attendees WHERE chat_room_attendees.chat_room_id = messages.chat_room_id AND chat_room_attendees.user_id = auth.uid()));
CREATE POLICY "chatroom_participants_send_messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM chat_room_attendees WHERE chat_room_attendees.chat_room_id = messages.chat_room_id AND chat_room_attendees.user_id = auth.uid()));

CREATE POLICY "admin_read_all_meetings" ON meetings FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "users_see_meetings_via_chatroom" ON meetings FOR SELECT USING (EXISTS (SELECT 1 FROM chat_rooms cr JOIN chat_room_attendees cra ON cr.id = cra.chat_room_id WHERE cr.meeting_id = meetings.id AND cra.user_id = auth.uid()));

CREATE POLICY "idea_holders_read_own_requests" ON pitch_requests FOR SELECT USING (EXISTS (SELECT 1 FROM ideas WHERE ideas.id = pitch_requests.idea_id AND ideas.owner_id = auth.uid()));
CREATE POLICY "investors_read_own_requests" ON pitch_requests FOR SELECT USING (auth.uid() = investor_id);
CREATE POLICY "admin_read_all_requests" ON pitch_requests FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "investors_create_requests" ON pitch_requests FOR INSERT WITH CHECK (auth.uid() = investor_id AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'investor'));

CREATE POLICY "investor_vote" ON task_votes FOR INSERT WITH CHECK (investor_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'investor'));
CREATE POLICY "idea_holder_read_votes" ON task_votes FOR SELECT USING (EXISTS (SELECT 1 FROM tasks t JOIN ideas i ON t.idea_id = i.id WHERE t.id = task_votes.task_id AND i.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "investors_read_own_votes" ON task_votes FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY "users_read_own_notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_read_all_payments" ON payments FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_read_own_agreements" ON agreements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_manage_own_agreements" ON agreements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_read_all_agreements" ON agreements FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
