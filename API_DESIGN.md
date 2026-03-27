# Coinvest MVP — API Design Specification

## Overview
RESTful API for the Coinvest platform. Base URL: `https://api.coinvest.local` (or your backend domain)

All endpoints require authentication unless marked as `Public`.

---

## 1. AUTHENTICATION ENDPOINTS

### POST /auth/signup
**Description:** User registration (idea holder or investor)

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "idea_holder" | "investor",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:** 201 Created
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "idea_holder",
  "status": "pending",
  "token": "jwt_token_here"
}
```

**Errors:**
- 400: Email already exists, invalid email, weak password
- 422: Missing required fields

---

### POST /auth/login
**Description:** User login

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** 200 OK
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "idea_holder",
  "status": "pending" | "approved" | "rejected",
  "token": "jwt_token_here"
}
```

**Errors:**
- 401: Invalid credentials
- 404: User not found

---

### POST /auth/logout
**Description:** Logout user

**Access:** Authenticated

**Response:** 204 No Content

---

## 2. AGREEMENTS & QUESTIONNAIRES

### GET /agreements/:agreement_type
**Description:** Fetch agreement text (Platform Terms, NDA, etc.)

**Access:** Public

**Params:**
- `agreement_type`: `platform_terms` | `nda_non_circumvention` | `intro_consulting`

**Response:** 200 OK
```json
{
  "agreement_type": "platform_terms",
  "version": "1.0",
  "content": "Full agreement text here...",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### POST /agreements/accept
**Description:** User accepts an agreement (checkbox confirmation)

**Access:** Authenticated

**Request Body:**
```json
{
  "agreement_type": "platform_terms",
  "version": "1.0"
}
```

**Response:** 201 Created
```json
{
  "agreement_id": "uuid",
  "user_id": "uuid",
  "agreement_type": "platform_terms",
  "status": "agreed",
  "agreed_at": "2024-01-15T10:30:00Z"
}
```

---

### POST /questionnaires
**Description:** Submit questionnaire (idea holder or investor specific questions)

**Access:** Authenticated

**Request Body:**
```json
{
  "role": "idea_holder" | "investor",
  "responses": {
    "question_1": "answer",
    "question_2": "answer",
    ...
  }
}
```

**Response:** 201 Created
```json
{
  "questionnaire_id": "uuid",
  "user_id": "uuid",
  "role": "idea_holder",
  "submitted_at": "2024-01-15T10:35:00Z",
  "status": "submitted"
}
```

---

### GET /questionnaires/:user_id
**Description:** Get questionnaire responses (admin only, or user viewing their own)

**Access:** Authenticated

**Response:** 200 OK
```json
{
  "questionnaire_id": "uuid",
  "user_id": "uuid",
  "role": "idea_holder",
  "responses": { ... },
  "submitted_at": "2024-01-15T10:35:00Z"
}
```

---

## 3. USER PROFILE

### GET /users/me
**Description:** Get current user profile

**Access:** Authenticated

**Response:** 200 OK
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "idea_holder",
  "status": "approved" | "pending" | "rejected",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### PUT /users/me
**Description:** Update user profile

**Access:** Authenticated

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+30 123 456 7890"
}
```

**Response:** 200 OK
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

## 4. IDEAS

### POST /ideas
**Description:** Create a new idea (idea holders only)

**Access:** Authenticated (idea_holder role)

**Request Body:**
```json
{
  "title": "AI-powered HR Platform",
  "description": "A platform that uses AI to...",
  "stage": "MVP" | "Early Stage" | "Growth",
  "target_audience": "Mid-market companies",
  "funding_requested": 50000
}
```

**Response:** 201 Created
```json
{
  "idea_id": "uuid",
  "owner_id": "uuid",
  "title": "AI-powered HR Platform",
  "description": "...",
  "stage": "MVP",
  "target_audience": "Mid-market companies",
  "funding_requested": 50000,
  "status": "submitted",
  "view_count": 0,
  "like_count": 0,
  "pitch_request_count": 0,
  "created_at": "2024-01-15T11:30:00Z"
}
```

**Notes:**
- Each new idea after the first requires a payment (idea_fee)
- User must have paid registration_fee first

---

### GET /ideas
**Description:** List ideas (filtered by status for investors, own ideas for idea holders)

**Access:** Authenticated

**Query Params:**
- `status`: `screened` (for investors) / `submitted`, `in_screening` (for admins)
- `page`: pagination (default 1)
- `limit`: results per page (default 10)
- `search`: keyword search in title/description
- `stage`: filter by stage
- `sort_by`: `created_at`, `like_count`, `view_count`

**Response:** 200 OK
```json
{
  "data": [
    {
      "idea_id": "uuid",
      "owner_id": "uuid",
      "title": "AI-powered HR Platform",
      "description": "...",
      "stage": "MVP",
      "status": "screened",
      "view_count": 5,
      "like_count": 2,
      "pitch_request_count": 1,
      "created_at": "2024-01-15T11:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

---

### GET /ideas/:idea_id
**Description:** Get idea details

**Access:** Authenticated (owner, screened investors, or admin)

**Response:** 200 OK
```json
{
  "idea_id": "uuid",
  "owner_id": "uuid",
  "title": "AI-powered HR Platform",
  "description": "...",
  "stage": "MVP",
  "target_audience": "Mid-market companies",
  "funding_requested": 50000,
  "status": "screened",
  "view_count": 5,
  "like_count": 2,
  "pitch_request_count": 1,
  "created_at": "2024-01-15T11:30:00Z"
}
```

**Side Effect:** Increments view_count

---

### PUT /ideas/:idea_id
**Description:** Update idea (owner only, before screening)

**Access:** Authenticated (owner)

**Request Body:**
```json
{
  "title": "New Title",
  "description": "Updated description",
  "stage": "Early Stage"
}
```

**Response:** 200 OK
```json
{
  "idea_id": "uuid",
  "title": "New Title",
  "description": "Updated description",
  "stage": "Early Stage",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

---

### DELETE /ideas/:idea_id
**Description:** Delete idea (owner or admin only)

**Access:** Authenticated (owner or admin)

**Response:** 204 No Content

---

## 5. LIKES & FAVORITES

### POST /ideas/:idea_id/like
**Description:** Like an idea (investor only)

**Access:** Authenticated (investor)

**Response:** 201 Created
```json
{
  "like_id": "uuid",
  "idea_id": "uuid",
  "investor_id": "uuid",
  "created_at": "2024-01-15T12:30:00Z"
}
```

**Side Effect:** Increments ideas.like_count

---

### DELETE /ideas/:idea_id/like
**Description:** Unlike an idea

**Access:** Authenticated (investor)

**Response:** 204 No Content

**Side Effect:** Decrements ideas.like_count

---

### POST /ideas/:idea_id/favorite
**Description:** Add idea to favorites

**Access:** Authenticated (investor)

**Response:** 201 Created
```json
{
  "favorite_id": "uuid",
  "idea_id": "uuid",
  "investor_id": "uuid",
  "created_at": "2024-01-15T12:35:00Z"
}
```

---

### DELETE /ideas/:idea_id/favorite
**Description:** Remove from favorites

**Access:** Authenticated (investor)

**Response:** 204 No Content

---

### GET /users/me/favorites
**Description:** Get user's favorite ideas

**Access:** Authenticated

**Query Params:**
- `page`, `limit`, `sort_by`

**Response:** 200 OK
```json
{
  "data": [
    {
      "idea_id": "uuid",
      "title": "AI-powered HR Platform",
      ...
    }
  ],
  "pagination": { ... }
}
```

---

## 6. PITCH REQUESTS

### POST /ideas/:idea_id/pitch-request
**Description:** Request a pitch meeting (investor only)

**Access:** Authenticated (investor)

**Request Body:**
```json
{
  "message": "I'm interested in this idea because..."
}
```

**Response:** 201 Created
```json
{
  "pitch_request_id": "uuid",
  "idea_id": "uuid",
  "investor_id": "uuid",
  "status": "pending",
  "message": "I'm interested...",
  "created_at": "2024-01-15T13:00:00Z"
}
```

**Side Effect:** Increments ideas.pitch_request_count

---

### GET /ideas/:idea_id/pitch-requests
**Description:** Get pitch requests for an idea (idea holder or admin)

**Access:** Authenticated (owner or admin)

**Response:** 200 OK
```json
{
  "data": [
    {
      "pitch_request_id": "uuid",
      "investor_id": "uuid",
      "investor_email": "investor@example.com",
      "status": "pending",
      "message": "I'm interested...",
      "created_at": "2024-01-15T13:00:00Z"
    }
  ]
}
```

---

### GET /users/me/pitch-requests
**Description:** Get pitch requests sent by current investor

**Access:** Authenticated (investor)

**Response:** 200 OK
```json
{
  "data": [
    {
      "pitch_request_id": "uuid",
      "idea_id": "uuid",
      "idea_title": "AI-powered HR Platform",
      "status": "pending" | "accepted" | "rejected",
      "created_at": "2024-01-15T13:00:00Z"
    }
  ]
}
```

---

## 7. CHAT ROOMS & MESSAGES

### POST /chat-rooms
**Description:** Create a chat room (admin only)

**Access:** Authenticated (admin)

**Request Body:**
```json
{
  "idea_id": "uuid",
  "meeting_id": "uuid_or_null",
  "participant_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:** 201 Created
```json
{
  "chat_room_id": "uuid",
  "idea_id": "uuid",
  "meeting_id": null,
  "status": "active",
  "participants": [
    {
      "user_id": "uuid1",
      "role": "idea_holder"
    },
    {
      "user_id": "uuid2",
      "role": "investor"
    }
  ],
  "created_at": "2024-01-15T13:30:00Z"
}
```

**Note:** Admin is automatically added to all chat rooms

---

### GET /chat-rooms/:chat_room_id
**Description:** Get chat room details

**Access:** Authenticated (participant or admin)

**Response:** 200 OK
```json
{
  "chat_room_id": "uuid",
  "idea_id": "uuid",
  "meeting_id": null,
  "status": "active",
  "participants": [ ... ],
  "created_at": "2024-01-15T13:30:00Z"
}
```

---

### GET /users/me/chat-rooms
**Description:** Get all chat rooms for current user

**Access:** Authenticated

**Response:** 200 OK
```json
{
  "data": [
    {
      "chat_room_id": "uuid",
      "idea_id": "uuid",
      "idea_title": "AI-powered HR Platform",
      "status": "active",
      "last_message": "...",
      "last_message_at": "2024-01-15T14:00:00Z",
      "unread_count": 3
    }
  ]
}
```

---

### POST /chat-rooms/:chat_room_id/messages
**Description:** Send a message

**Access:** Authenticated (participant)

**Request Body:**
```json
{
  "content": "Great idea! I'm interested."
}
```

**Response:** 201 Created
```json
{
  "message_id": "uuid",
  "chat_room_id": "uuid",
  "sender_id": "uuid",
  "sender_name": "John Doe",
  "sender_role": "investor",
  "content": "Great idea! I'm interested.",
  "created_at": "2024-01-15T14:05:00Z"
}
```

---

### GET /chat-rooms/:chat_room_id/messages
**Description:** Get messages in a chat room (paginated, newest first)

**Access:** Authenticated (participant)

**Query Params:**
- `limit`: messages per page (default 50)
- `offset`: pagination offset (default 0)

**Response:** 200 OK
```json
{
  "data": [
    {
      "message_id": "uuid",
      "sender_id": "uuid",
      "sender_name": "John Doe",
      "sender_role": "investor",
      "content": "Great idea!",
      "created_at": "2024-01-15T14:05:00Z"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total": 120
  }
}
```

---

## 8. MEETINGS

### POST /meetings
**Description:** Create a meeting (admin only)

**Access:** Authenticated (admin)

**Request Body:**
```json
{
  "idea_id": "uuid",
  "scheduled_at": "2024-01-20T10:00:00Z",
  "duration_minutes": 60,
  "investor_ids": ["uuid1", "uuid2"],
  "meeting_room_link": "https://daily.co/room123"
}
```

**Response:** 201 Created
```json
{
  "meeting_id": "uuid",
  "idea_id": "uuid",
  "scheduled_at": "2024-01-20T10:00:00Z",
  "duration_minutes": 60,
  "status": "scheduled",
  "meeting_room_link": "https://daily.co/room123",
  "meeting_room_type": "daily_co",
  "created_at": "2024-01-15T14:30:00Z"
}
```

**Side Effect:**
- Updates idea.status → `meeting_scheduled`
- Creates a chat room linked to this meeting
- Sends notifications to all participants

---

### GET /meetings/:meeting_id
**Description:** Get meeting details

**Access:** Authenticated (participant or admin)

**Response:** 200 OK
```json
{
  "meeting_id": "uuid",
  "idea_id": "uuid",
  "idea_title": "AI-powered HR Platform",
  "scheduled_at": "2024-01-20T10:00:00Z",
  "duration_minutes": 60,
  "status": "scheduled",
  "meeting_room_link": "https://daily.co/room123",
  "participants": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "role": "investor"
    }
  ],
  "chat_room_id": "uuid"
}
```

---

### GET /users/me/meetings
**Description:** Get all meetings for current user

**Access:** Authenticated

**Response:** 200 OK
```json
{
  "data": [
    {
      "meeting_id": "uuid",
      "idea_title": "AI-powered HR Platform",
      "scheduled_at": "2024-01-20T10:00:00Z",
      "status": "scheduled" | "in_progress" | "completed",
      "meeting_room_link": "https://daily.co/room123"
    }
  ]
}
```

---

### PUT /meetings/:meeting_id/status
**Description:** Update meeting status (admin)

**Access:** Authenticated (admin)

**Request Body:**
```json
{
  "status": "scheduled" | "in_progress" | "completed" | "cancelled"
}
```

**Response:** 200 OK
```json
{
  "meeting_id": "uuid",
  "status": "completed",
  "updated_at": "2024-01-20T11:05:00Z"
}
```

**Side Effects:**
- If status = `completed`:
  - Updates idea.status → `meeting_done`
  - Creates tasks for "next step decision"

---

## 9. TASKS & VOTING

### GET /ideas/:idea_id/tasks
**Description:** Get tasks for an idea

**Access:** Authenticated (participants or admin)

**Response:** 200 OK
```json
{
  "data": [
    {
      "task_id": "uuid",
      "meeting_id": "uuid",
      "idea_id": "uuid",
      "task_type": "next_step_decision",
      "status": "open",
      "created_at": "2024-01-20T11:10:00Z",
      "votes": [
        {
          "investor_id": "uuid",
          "investor_name": "John Doe",
          "vote": "yes" | "no" | "undecided",
          "comments": "Great potential!"
        }
      ],
      "yes_count": 2,
      "no_count": 0,
      "undecided_count": 1
    }
  ]
}
```

---

### POST /tasks/:task_id/vote
**Description:** Vote on a task (investor only)

**Access:** Authenticated (investor participant in the idea)

**Request Body:**
```json
{
  "vote": "yes" | "no" | "undecided",
  "comments": "Great potential! Let's proceed."
}
```

**Response:** 201 Created
```json
{
  "vote_id": "uuid",
  "task_id": "uuid",
  "investor_id": "uuid",
  "vote": "yes",
  "comments": "Great potential!",
  "created_at": "2024-01-20T11:15:00Z"
}
```

---

### PUT /tasks/:task_id/vote
**Description:** Update vote (investor can change vote before task closes)

**Access:** Authenticated (investor who voted)

**Request Body:**
```json
{
  "vote": "yes" | "no" | "undecided",
  "comments": "Updated comments"
}
```

**Response:** 200 OK
```json
{
  "vote_id": "uuid",
  "task_id": "uuid",
  "vote": "yes",
  "updated_at": "2024-01-20T11:20:00Z"
}
```

---

### PUT /tasks/:task_id/status
**Description:** Close task / mark as completed (admin)

**Access:** Authenticated (admin)

**Request Body:**
```json
{
  "status": "completed" | "cancelled"
}
```

**Response:** 200 OK
```json
{
  "task_id": "uuid",
  "status": "completed",
  "updated_at": "2024-01-20T11:25:00Z"
}
```

**Side Effect:**
- If at least one "yes" vote and status = completed:
  - idea.status → `next_step_pending`
  - Admin is notified to schedule next meeting

---

## 10. NOTES

### POST /ideas/:idea_id/notes
**Description:** Add a note to an idea (participants or admin)

**Access:** Authenticated

**Request Body:**
```json
{
  "content": "Discussed pricing model. Customer acquisition cost is high."
}
```

**Response:** 201 Created
```json
{
  "note_id": "uuid",
  "idea_id": "uuid",
  "created_by_user_id": "uuid",
  "created_by_name": "John Doe",
  "content": "Discussed pricing model...",
  "created_at": "2024-01-20T12:00:00Z"
}
```

---

### GET /ideas/:idea_id/notes
**Description:** Get all notes for an idea

**Access:** Authenticated (participants or admin)

**Response:** 200 OK
```json
{
  "data": [
    {
      "note_id": "uuid",
      "created_by_name": "John Doe",
      "content": "Discussed pricing model...",
      "created_at": "2024-01-20T12:00:00Z"
    }
  ]
}
```

---

## 11. ADMIN ENDPOINTS

### GET /admin/users
**Description:** List all users (admin only)

**Access:** Authenticated (admin)

**Query Params:**
- `status`: `pending`, `approved`, `rejected`
- `role`: `idea_holder`, `investor`
- `search`: by email or name
- `page`, `limit`

**Response:** 200 OK
```json
{
  "data": [
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "role": "idea_holder",
      "status": "pending",
      "first_name": "John",
      "last_name": "Doe",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### PUT /admin/users/:user_id/status
**Description:** Approve or reject user (admin only)

**Access:** Authenticated (admin)

**Request Body:**
```json
{
  "status": "approved" | "rejected"
}
```

**Response:** 200 OK
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "status": "approved",
  "updated_at": "2024-01-15T15:00:00Z"
}
```

**Side Effect:**
- If approved: user can now access dashboard and see screened ideas
- Notification sent to user

---

### GET /admin/ideas
**Description:** List all ideas with screening status (admin only)

**Access:** Authenticated (admin)

**Query Params:**
- `status`: `submitted`, `in_screening`, `screened`, `rejected`
- `page`, `limit`

**Response:** 200 OK
```json
{
  "data": [
    {
      "idea_id": "uuid",
      "owner_id": "uuid",
      "owner_email": "user@example.com",
      "title": "AI-powered HR Platform",
      "status": "submitted",
      "view_count": 0,
      "like_count": 0,
      "pitch_request_count": 0,
      "created_at": "2024-01-15T11:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### PUT /admin/ideas/:idea_id/status
**Description:** Screen idea (admin only)

**Access:** Authenticated (admin)

**Request Body:**
```json
{
  "status": "screened" | "rejected",
  "rejection_reason": "Duplicate of existing idea" (optional)
}
```

**Response:** 200 OK
```json
{
  "idea_id": "uuid",
  "status": "screened",
  "updated_at": "2024-01-15T16:00:00Z"
}
```

**Side Effects:**
- If screened: idea visible to investors
- If rejected: idea hidden, owner notified
- Notification sent to owner

---

### GET /admin/payments
**Description:** List all payments (admin only)

**Access:** Authenticated (admin)

**Query Params:**
- `status`: `pending`, `completed`, `failed`, `refunded`
- `payment_type`: `registration_fee`, `idea_fee`, etc.
- `user_id`: filter by user
- `page`, `limit`

**Response:** 200 OK
```json
{
  "data": [
    {
      "payment_id": "uuid",
      "user_id": "uuid",
      "user_email": "user@example.com",
      "payment_type": "registration_fee",
      "amount": 100.00,
      "currency": "EUR",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### GET /admin/analytics
**Description:** Get platform analytics (admin only)

**Access:** Authenticated (admin)

**Query Params:**
- `start_date`: ISO date
- `end_date`: ISO date

**Response:** 200 OK
```json
{
  "users": {
    "total": 150,
    "idea_holders": 75,
    "investors": 75,
    "approved": 120,
    "pending": 30
  },
  "ideas": {
    "total": 45,
    "submitted": 10,
    "screened": 25,
    "rejected": 10
  },
  "meetings": {
    "total": 12,
    "scheduled": 3,
    "completed": 8,
    "cancelled": 1
  },
  "revenue": {
    "registration_fees": 15000.00,
    "idea_fees": 8500.00,
    "total": 23500.00
  }
}
```

---

## 12. PAYMENTS (MVP - Mocked)

### POST /payments/process
**Description:** Process payment (mocked for MVP)

**Access:** Authenticated

**Request Body:**
```json
{
  "payment_type": "registration_fee" | "idea_fee",
  "amount": 100.00,
  "currency": "EUR",
  "related_idea_id": "uuid" (optional, for idea_fee)
}
```

**Response:** 201 Created
```json
{
  "payment_id": "uuid",
  "user_id": "uuid",
  "payment_type": "registration_fee",
  "amount": 100.00,
  "status": "completed",
  "created_at": "2024-01-15T17:00:00Z"
}
```

**Note:** In MVP, all payments are automatically marked as "completed". In Phase 5, integrate Stripe.

---

## 13. NOTIFICATIONS

### GET /users/me/notifications
**Description:** Get unread notifications for current user

**Access:** Authenticated

**Query Params:**
- `limit`, `offset`
- `read`: filter by read status (default: unread only)

**Response:** 200 OK
```json
{
  "data": [
    {
      "notification_id": "uuid",
      "type": "pitch_request", "meeting_scheduled", "task_created", etc.,
      "title": "New pitch request from John Doe",
      "message": "John Doe requested a pitch meeting for your idea...",
      "related_idea_id": "uuid",
      "related_meeting_id": "uuid",
      "read_at": null,
      "created_at": "2024-01-15T17:30:00Z"
    }
  ]
}
```

---

### PUT /notifications/:notification_id/read
**Description:** Mark notification as read

**Access:** Authenticated

**Response:** 200 OK
```json
{
  "notification_id": "uuid",
  "read_at": "2024-01-15T17:35:00Z"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED`: Missing or invalid token
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request body
- `CONFLICT`: Resource already exists
- `INTERNAL_ERROR`: Server error

---

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

Token includes:
- `user_id`
- `email`
- `role` (idea_holder, investor, admin)
- `status` (pending, approved, rejected)

---

## Summary Table

| Resource | Method | Endpoint | Access | Description |
|----------|--------|----------|--------|-------------|
| Auth | POST | /auth/signup | Public | User registration |
| Auth | POST | /auth/login | Public | User login |
| Auth | POST | /auth/logout | Auth | User logout |
| Ideas | POST | /ideas | Auth (IH) | Create idea |
| Ideas | GET | /ideas | Auth | List ideas |
| Ideas | GET | /ideas/:id | Auth | Get idea |
| Ideas | PUT | /ideas/:id | Auth (Owner) | Update idea |
| Ideas | DELETE | /ideas/:id | Auth (Owner/Admin) | Delete idea |
| Likes | POST | /ideas/:id/like | Auth (Investor) | Like idea |
| Likes | DELETE | /ideas/:id/like | Auth (Investor) | Unlike idea |
| Favorites | POST | /ideas/:id/favorite | Auth (Investor) | Add to favorites |
| Favorites | DELETE | /ideas/:id/favorite | Auth (Investor) | Remove from favorites |
| Favorites | GET | /users/me/favorites | Auth | Get favorites |
| Pitch Requests | POST | /ideas/:id/pitch-request | Auth (Investor) | Request pitch |
| Pitch Requests | GET | /ideas/:id/pitch-requests | Auth (Owner/Admin) | Get requests |
| Pitch Requests | GET | /users/me/pitch-requests | Auth | Get sent requests |
| Chat | POST | /chat-rooms | Auth (Admin) | Create room |
| Chat | GET | /chat-rooms/:id | Auth (Participant) | Get room |
| Chat | GET | /users/me/chat-rooms | Auth | List rooms |
| Chat | POST | /chat-rooms/:id/messages | Auth (Participant) | Send message |
| Chat | GET | /chat-rooms/:id/messages | Auth (Participant) | Get messages |
| Meetings | POST | /meetings | Auth (Admin) | Create meeting |
| Meetings | GET | /meetings/:id | Auth (Participant) | Get meeting |
| Meetings | GET | /users/me/meetings | Auth | List meetings |
| Meetings | PUT | /meetings/:id/status | Auth (Admin) | Update status |
| Tasks | GET | /ideas/:id/tasks | Auth (Participant) | Get tasks |
| Tasks | POST | /tasks/:id/vote | Auth (Investor) | Vote on task |
| Tasks | PUT | /tasks/:id/vote | Auth (Investor) | Update vote |
| Tasks | PUT | /tasks/:id/status | Auth (Admin) | Close task |
| Notes | POST | /ideas/:id/notes | Auth | Add note |
| Notes | GET | /ideas/:id/notes | Auth | Get notes |
| Admin | GET | /admin/users | Auth (Admin) | List users |
| Admin | PUT | /admin/users/:id/status | Auth (Admin) | Approve/reject user |
| Admin | GET | /admin/ideas | Auth (Admin) | List all ideas |
| Admin | PUT | /admin/ideas/:id/status | Auth (Admin) | Screen idea |
| Admin | GET | /admin/payments | Auth (Admin) | List payments |
| Admin | GET | /admin/analytics | Auth (Admin) | Get analytics |
| Payments | POST | /payments/process | Auth | Process payment |
| Notifications | GET | /users/me/notifications | Auth | Get notifications |
| Notifications | PUT | /notifications/:id/read | Auth | Mark as read |

---

## Ready for Implementation?

Once you approve this API design, I'll build the backend (Node.js/Express + Supabase) to implement all these endpoints.

Any changes or additions needed before we proceed to coding?
