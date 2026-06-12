# DevSpace 🚀

A real-time collaborative mock interview platform built for developers. Conduct live coding interviews with synchronized editors, AI-generated problems, and structured feedback — all in the browser.

---

## What is DevSpace?

DevSpace lets interviewers and candidates collaborate in a shared coding environment. The interviewer controls the session — generating problems, pushing hints, setting timers, and ending the session with structured feedback. The candidate writes code in a live Monaco editor that syncs in real time.

---

## Features

### Authentication
- JWT-based auth with HTTP-only cookies
- Protected routes — unauthenticated users redirected to login
- Role-based access — `interviewer` and `candidate` roles with different permissions

### Rooms & Collaboration
- Interviewers create rooms (interview or collab mode)
- Candidates join via unique invite link
- Real-time participant tracking with live avatar stack
- Tab-switch cheat detection — interviewer gets alerted if candidate leaves the window

### Live Code Editor
- Monaco Editor (same as VS Code) shared in real time via Socket.io
- Multi-language support — Python, C++, JavaScript, Java, and more
- Per-problem, per-language code caching — switching problems never loses your work
- Boilerplate auto-loaded on language switch
- Late-join support — joining mid-session restores current editor state
- **Live cursor sync** — each participant's cursor is visible to others in real time, color-coded by user with name on hover

### AI Problem Generation
- Interviewers type a topic → Groq (llama-3.3-70b) generates a full coding problem
- DB cache check first — avoids duplicate Groq calls for same problem
- Problems include: title, description, examples, constraints, boilerplate code per language
- Test cases stored in DB but **never sent to candidate** (anti-cheat)
- Problems sync to candidate screen via socket

### Interviewer Panel (Private)
- **Hint composer** — push hints directly to candidate as a popup
- **Session timer** — set a countdown synced across both screens via end timestamp
- **Private notes** — saved to DB on session end, never visible to candidate

### Session Management
- End Session saves full code snapshots + interviewer notes to DB
- Socket overwrites with server-side code state for accuracy
- Session locked after end — editor becomes read-only for both
- Candidate sees alert when session ends

### Feedback & Review
- Interviewer fills structured feedback form after session (communication, problem solving, code quality, overall — rated 1-5 + comments)
- Full session review page — browse code snapshots per problem/language, view ratings and notes
- Past sessions shown on dashboard with overall score

### Dashboard
- Active rooms with status indicators (waiting / active / ended)
- Session history with score preview
- Candidates can create collab rooms but not interview rooms (role-enforced on frontend + backend)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Monaco Editor |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| AI | Groq SDK (llama-3.3-70b-versatile) |
| Auth | JWT + HTTP-only cookies |

---

## Project Structure

```
devspace/
├── backend/
│   └── src/
│       ├── controllers/
│       │   ├── user.controller.js
│       │   ├── room.controller.js
│       │   ├── session.controller.js
│       │   ├── problem.controller.js
│       │   └── code.controller.js
│       ├── models/
│       │   ├── user.model.js
│       │   ├── room.model.js
│       │   ├── session.model.js
│       │   └── problem.model.js
│       ├── routes/
│       │   ├── user.routes.js
│       │   ├── room.routes.js
│       │   ├── session.routes.js
│       │   ├── problem.routes.js
│       │   └── code.routes.js
│       ├── services/
│       │   └── ai.service.js
│       ├── socket/
│       │   └── index.js
│       ├── middlewares/
│       │   ├── auth.middleware.js
│       │   └── role.middleware.js
│       ├── utils/
│       │   ├── asyncHandler.js
│       │   ├── ApiErrors.js
│       │   └── ApiResponse.js
│       ├── db/
│       │   └── index.js
│       ├── app.js
│       └── index.js
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Room.jsx
        │   └── SessionReview.jsx
        ├── components/
        │   ├── ProblemGeneratorModal.jsx
        │   ├── FeedbackModal.jsx
        │   ├── LoadingSpinner.jsx
        │   └── ProtectedRoute.jsx
        ├── context/
        │   ├── AuthContext.jsx
        │   └── SocketContext.jsx
        ├── services/
        │   ├── api.js
        │   ├── session.service.js
        │   ├── problem.service.js
        │   ├── code.service.js
        │   └── setupAxios.js
        ├── styles/
        │   └── monaco.css
        ├── img/
        ├── App.jsx
        ├── main.jsx
        └── index.css
```

---

## How It Works — Core Flows

### Real-time Code Sync
Every keystroke emits `code-change` to server → server updates `roomCodeState` (in-memory Map) → broadcasts `code-update` to the other participant. An `isRemoteUpdate` flag prevents infinite emit loops. `activeProblemRef` and `languageRef` use refs instead of state inside socket listeners to avoid stale closures.

### Problem Generation
`POST /rooms/:roomId/add-problem` → DB regex search first (cache hit = instant, free) → Groq only if not found → saved to DB with `generatedBy` field → room updated → interviewer state updates via HTTP response → candidate notified via `notify-new-problem` socket event.

### Timer Sync
Server calculates `endTime = Date.now() + (minutes * 60 * 1000)` → emits once to both clients → both sides run their own `setInterval` subtracting `Date.now()` every second. Always in sync. No repeated emissions. Saved to `roomCodeState` for late joiners.

### End Session
HTTP PUT first (data safety) → saves code snapshots + notes → creates Session in DB → sets `room.status = "ended"` → returns `sessionId` → socket fires `trigger-end-session` → server overwrites snapshots with more accurate server-side RAM state → `io.to(roomId)` notifies both screens → `roomCodeState` deleted.

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Groq API key — get one free at [console.groq.com](https://console.groq.com)

### Backend Setup

```bash
cd backend
npm install
```

Create `.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env`:
```env
VITE_BACKEND_URL=http://localhost:4000
```

```bash
npm run dev
```

---

## Environment Variables

### Backend
| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GROQ_API_KEY` | Groq API key for AI problem generation |
| `CLIENT_URL` | Frontend URL for CORS |

### Frontend
| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Backend URL for both API calls and socket connection |

---

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login |
| POST | `/api/users/logout` | Logout |
| GET | `/api/users/me` | Get current user |

### Rooms
| Method | Route | Description |
|---|---|---|
| POST | `/api/rooms` | Create room |
| POST | `/api/rooms/join/:inviteLink` | Join room via invite |
| GET | `/api/rooms/my-rooms` | Get user's rooms |
| GET | `/api/rooms/:roomId` | Get room by ID |
| POST | `/api/rooms/:roomId/add-problem` | Generate + add problem |
| PUT | `/api/rooms/:roomId/end` | End session |
| DELETE | `/api/rooms/:roomId` | Delete room |

### Sessions
| Method | Route | Description |
|---|---|---|
| GET | `/api/sessions/my-sessions` | Get past sessions |
| GET | `/api/sessions/:sessionId` | Get session by ID |
| PUT | `/api/sessions/:sessionId/feedback` | Submit feedback |
| DELETE | `/api/sessions/:sessionId` | Delete session |

---

## Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join-room` | `roomId` | Join socket room |
| `leave-room` | `roomId` | Leave socket room |
| `code-change` | `{ roomId, problemId, language, code }` | Sync code |
| `language-change` | `{ roomId, problemId, language }` | Sync language |
| `cursor-change` | `{ roomId, userId, userName, position }` | Broadcast local cursor position |
| `send-message` | `{ roomId, content }` | Send chat message |
| `problem-selected` | `{ roomId, problemId }` | Switch active problem |
| `notify-new-problem` | `{ roomId, updatedRoomData }` | Notify new problem added |
| `send-hint` | `{ roomId, hint }` | Push hint to candidate |
| `start-timer` | `{ roomId, durationMinutes }` | Start countdown |
| `trigger-end-session` | `{ roomId }` | End session |
| `tab-switched` | `{ roomId, candidateName }` | Cheat detection |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `room-state` | Full room state | Late join state restore |
| `participants-updated` | `[users]` | Participant list changed |
| `code-update` | `{ problemId, language, code }` | Receive code sync |
| `language-update` | `{ problemId, language }` | Receive language sync |
| `receive-cursor` | `{ userId, userName, position }` | Receive remote cursor position |
| `receive-message` | `{ content, sender, createdAt }` | Receive chat message |
| `problem-loaded` | `problem` | Active problem switched |
| `room-updated` | `updatedRoomData` | New problem added |
| `receive-hint` | `{ hint }` | Hint from interviewer |
| `timer-started` | `{ endTime }` | Timer started |
| `interview-ended` | — | Session ended |
| `cheat-warning` | `{ message }` | Candidate switched tabs |

---

## Key Design Decisions

**Why `socket.to()` vs `io.to()`?**
`socket.to()` sends to everyone in the room except the sender. `io.to()` sends to everyone including the sender. Code sync uses `socket.to()` (sender already updated locally). Session end uses `io.to()` (both need to lock).

**Why HTTP before socket on end session?**
Data must be saved to DB before anyone is notified. If socket fired first and HTTP failed — candidate would see "session ended" but nothing would be saved. Write first, notify second.

**Why `temperature: 0.0` for Groq?**
We want consistent, structured JSON output — not creative variation. Zero temperature = deterministic, always follows the schema strictly.

**Why refs for `activeProblem` and `language` inside socket listeners?**
Socket listeners are created once and capture the initial state value (stale closure). Refs always point to the latest value without needing to re-register listeners.


---
