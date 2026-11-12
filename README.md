# Fluento

Fluento is an English learning platform where you talk with AI teachers. Pick a teacher, type or speak, and they correct your English as the conversation flows.

The **Next.js** frontend streams replies from a **FastAPI** backend powered by **Groq**. The backend is intentionally small, so it can be built up step by step.

## Features

- Seven English teachers, each with their own personality, specialty and voice: Maya, Arjun, Emma, Leo, Sophia, Riya and James
- Pick a teacher and talk to them directly; each teacher keeps one ongoing conversation
- Teachers show as online, with a typing indicator while they reply
- Each conversation takes on the teacher's own color, with tap-to-send conversation starters
- Teachers correct your English as you go and keep the conversation flowing
- Voice input that writes your words as you speak, and read-aloud replies in the teacher's voice
- Streaming replies with Markdown, tables and code blocks
- Clear or export a conversation, with undo
- Admin panel at `/admin` to manage teachers (static for now)
- Command palette (`Cmd/Ctrl + K`) to jump to any teacher, plus a shortcuts dialog (`Cmd/Ctrl + /`)
- Light, dark and system themes, keyboard shortcuts and a mobile-friendly layout

## Tech stack

| Layer    | Tech                                                     |
| -------- | -------------------------------------------------------- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS v4 |
| Backend  | Python 3.12+, FastAPI, Groq SDK, pydantic-settings, uv   |

## Project structure

```
Fluento/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app: /health, /teachers, /chat (SSE), /transcribe
│   │   ├── config.py          # Settings from env vars / .env
│   │   ├── llm.py             # Groq client and streaming completion
│   │   ├── speech.py          # Speech-to-text fallback
│   │   ├── schemas.py         # Request and response models
│   │   └── agents/
│   │       ├── registry.py    # Every teacher agent, by id
│   │       ├── core/          # Persona model, prompt builder, TeacherAgent
│   │       ├── rules/         # Shared rules: identity, conversation, corrections, language, formatting, safety
│   │       └── teachers/      # One persona file per teacher (maya.py, arjun.py, ...)
│   ├── pyproject.toml
│   └── .env.example
└── frontend/
    ├── app/               # layout, page, global styles
    ├── components/        # Sidebar, MessageList, Composer, ToolCallCard, ...
    ├── hooks/             # useChat, useTheme, useBackendStatus
    ├── lib/               # SSE client, event reducer, types, storage
    └── .env.example
```

## Getting started

### Backend

Get a free API key from [console.groq.com](https://console.groq.com) and set `GROQ_API_KEY` in `backend/.env`.

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

| Variable          | Default                     | Description                          |
| ----------------- | --------------------------- | ------------------------------------ |
| `GROQ_API_KEY`    | (required)                  | Groq API key                         |
| `LLM_MODEL`       | `openai/gpt-oss-120b`       | Groq model to use                    |
| `LLM_MAX_TOKENS`  | `4096`                      | Max tokens per reply                 |
| `LLM_TEMPERATURE` | `0.3`                       | Sampling temperature                 |
| `STT_MODEL`       | `whisper-large-v3-turbo`    | Fallback speech-to-text model        |
| `HISTORY_LIMIT`   | `40`                        | Max past messages sent to the model  |
| `CORS_ORIGINS`    | `["http://localhost:3000"]` | Allowed frontend origins (JSON list) |

The frontend reads `NEXT_PUBLIC_API_URL` (backend address) and `NEXT_PUBLIC_SITE_URL` (public site address, used for SEO links) from `frontend/.env.local`.

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
- [ ] Conversation memory on the backend
- [ ] Tests and Docker setup
