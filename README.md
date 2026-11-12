# Fluento

Fluento is an English learning platform where you talk with AI teachers. Pick a teacher, type or speak, and they correct your English as the conversation flows.

The **Next.js** frontend streams replies from a **FastAPI** backend powered by **Groq**. Everything is dynamic: teachers, their AI personas, the shared teaching rules, app settings, users and conversations all live in **MongoDB** and are managed from the admin panel.

## Features

- Seven English teachers, each with their own personality, specialty and voice: Maya, Arjun, Emma, Leo, Sophia, Riya and James
- Browse teachers by goal (speaking, grammar, vocabulary, exams, work, beginners) and pick one to talk to
- Teachers you pick appear in your sidebar under My teachers; each keeps one ongoing conversation
- Teachers show as online, with a typing indicator while they reply
- Each conversation takes on the teacher's own color, with tap-to-send conversation starters
- Teachers correct your English as you go and keep the conversation flowing
- Voice input that writes your words as you speak, and read-aloud replies in the teacher's voice
- Streaming replies with Markdown, tables and code blocks
- Clear or export a conversation, with undo
- Accounts with email and password sign-up and log-in; conversations are saved to your account
- Learner memory: teachers remember each learner's goals, interests, level and recurring mistakes across conversations and teachers. A background AI call updates it every few messages as structured JSON, and learners can view, edit or turn it off
- A separate admin panel at `/admin` with its own team sign-in: live stats, full teacher and persona editor with a prompt preview, shared rules, app and model settings, learners, every learner conversation, and team members with owner and admin roles
- Command palette (`Cmd/Ctrl + K`) to jump to any teacher, plus a shortcuts dialog (`Cmd/Ctrl + /`)
- Light, dark and system themes, keyboard shortcuts and a mobile-friendly layout

## Tech stack

| Layer    | Tech                                                     |
| -------- | -------------------------------------------------------- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS v4 |
| Backend  | Python 3.12+, FastAPI, Groq SDK, PyMongo (async), uv     |
| Database | MongoDB                                                  |

## Project structure

```
Fluento/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app; seeds the database on startup
│   │   ├── config.py          # Settings from env vars / .env
│   │   ├── db.py              # MongoDB client and indexes
│   │   ├── security.py        # Password hashing, JWT session cookie, login/admin guards
│   │   ├── routers/           # public, auth, me, chat (SSE), admin
│   │   ├── schemas/           # Request and response models
│   │   ├── services/          # Groq LLM, speech-to-text, app settings, conversations
│   │   ├── agents/            # System prompt builder and teacher agent
│   │   └── seed/              # Default teachers, rules and settings for a new database
│   ├── pyproject.toml
│   └── .env.example
└── frontend/
    ├── app/               # Pages: home, login, signup, admin/*
    ├── components/        # Chat UI, landing page, auth, admin
    ├── hooks/             # useTeacherChats, useTeachers, useLoad, ...
    ├── lib/               # API client, SSE client, types
    └── .env.example
```

## Getting started

### Backend

Get a free API key from [console.groq.com](https://console.groq.com) and a MongoDB connection string (for example a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster), then fill in `backend/.env`.

On first start the backend creates the indexes, seeds the seven teachers, the shared rules and the default settings, and, if there are no team members yet, creates an owner account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Sign in with it at `/admin/login`, then add the rest of your team from **Admin → Team**.

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Configuration

Backend settings live in `backend/app/config.py` and are read from `backend/.env`:

| Variable         | Default                     | Description                                           |
| ---------------- | --------------------------- | ----------------------------------------------------- |
| `GROQ_API_KEY`   | (required)                  | Groq API key                                          |
| `MONGODB_URI`    | (required)                  | MongoDB connection string                             |
| `MONGODB_DB`     | `fluento`                   | Database name                                         |
| `JWT_SECRET`     | (required)                  | Secret for signing session cookies                    |
| `ADMIN_EMAIL`    | (optional)                  | First owner account, created when there are no admins |
| `ADMIN_PASSWORD` | (optional)                  | Password for that first owner                         |
| `SESSION_DAYS`   | `30`                        | How long a login lasts                                |
| `COOKIE_SECURE`  | `false`                     | Set to `true` when serving over HTTPS                 |
| `CORS_ORIGINS`   | `["http://localhost:3000"]` | Allowed frontend origins (JSON list)                  |

The model, temperature, max tokens, history limit, speech-to-text model and sign-up switch are stored in MongoDB and edited from **Admin → Settings**; changes apply without a restart.

The frontend reads `NEXT_PUBLIC_API_URL` (backend address) and `NEXT_PUBLIC_SITE_URL` (public site address, used for SEO links) from `frontend/.env.local`.

## API

| Area   | Endpoints                                                                                                                                                   | Access       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Public | `GET /health`, `GET /teachers`, `GET /app-settings`                                                                                                         | Anyone       |
| Auth   | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`                                                                                | Anyone       |
| Learn  | `POST /chat` (SSE), `POST /transcribe`, `GET/PUT /me/teachers`, `GET/PUT/DELETE /me/conversations/{teacher_id}`                                             | Logged in    |
| Admin  | `/admin/auth/*` (team sign-in), `/admin/stats`, `/admin/teachers`, `/admin/rules`, `/admin/settings`, `/admin/users`, `/admin/conversations`, `/admin/team` | Team members |

Learners and team members are completely separate: learners are stored in the `users` collection and team members in `admins`, each with their own login and their own httpOnly JWT cookie. Only owners can manage the team. Teacher personas are only returned by the admin API; learners see public profile fields.

## Streaming protocol

`POST /chat` takes the teacher to talk to and the conversation so far:

```json
{
  "teacher_id": "maya",
  "messages": [{ "role": "user", "content": "Hello" }]
}
```

`GET /teachers` lists the available teachers (id, name, role, specialty, languages). Teacher prompts stay on the backend.

It responds with Server-Sent Events. Each event is a `data: <json>` line:

| Event         | Shape                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| `text`        | `{ "type": "text", "text": "partial token" }`                               |
| `tool_call`   | `{ "type": "tool_call", "id": "t1", "name": "calculator", "input": {...} }` |
| `tool_result` | `{ "type": "tool_result", "id": "t1", "output": "42", "is_error": false }`  |
| `error`       | `{ "type": "error", "message": "..." }`                                     |
| `done`        | `{ "type": "done" }`                                                        |

Any backend that emits these events works with the UI.

`POST /transcribe` takes an audio file as multipart form data (`file`) and returns `{ "text": "..." }`.

## Keyboard shortcuts

| Shortcut               | Action                                     |
| ---------------------- | ------------------------------------------ |
| `Enter`                | Send                                       |
| `Shift + Enter`        | New line                                   |
| `Cmd/Ctrl + Shift + O` | New chat                                   |
| `Cmd/Ctrl + B`         | Toggle sidebar                             |
| `/`                    | Focus the composer                         |
| `Esc`                  | Stop generating, or cancel voice recording |
| `Enter` (recording)    | Finish recording and transcribe            |

## Roadmap

- [x] Chat UI and streaming protocol
- [x] FastAPI backend with streaming replies from Groq
- [ ] Add tools (calculator, current time, web search)
- [ ] Agent loop: call tools until the task is done
- [x] Conversation memory on the backend (MongoDB)
- [x] Accounts and an admin panel
- [x] Learner memory shared across teachers
- [ ] Tests and Docker setup
