# Agent Chat

A chat app for a tool-using AI agent. The **Next.js** frontend streams replies from a **FastAPI** backend and shows each tool call the agent makes.

The backend is intentionally a skeleton. It streams a demo reply so the UI works end to end, and the real agent gets built step by step.

## Features

- Streaming responses with live Markdown, GFM tables, and syntax-highlighted code blocks with copy
- Collapsible tool-call cards that show the input, output, status, and duration
- Conversation sidebar with search, date groups, rename, and delete, saved in local storage
- Edit and resend, regenerate, stop generating, and retry on error
- Light, dark, and system themes
- Backend health indicator
- Keyboard shortcuts and a mobile-friendly layout

## Tech stack

| Layer    | Tech                                                |
| -------- | --------------------------------------------------- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS v4 |
| Backend  | Python 3.12+, FastAPI, Uvicorn, uv                  |

## Project structure

```
agent-chat/
├── backend/
│   ├── app/main.py        # FastAPI app: /health and /chat (SSE)
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

## Streaming protocol

`POST /chat` takes:

```json
{
  "conversation_id": "abc123",
  "messages": [{ "role": "user", "content": "Hello" }]
}
```

It responds with Server-Sent Events. Each event is a `data: <json>` line:

| Event         | Shape                                                         |
| ------------- | ------------------------------------------------------------- |
| `text`        | `{ "type": "text", "text": "partial token" }`                 |
| `tool_call`   | `{ "type": "tool_call", "id": "t1", "name": "calculator", "input": {...} }` |
| `tool_result` | `{ "type": "tool_result", "id": "t1", "output": "42", "is_error": false }` |
| `error`       | `{ "type": "error", "message": "..." }`                       |
| `done`        | `{ "type": "done" }`                                          |

Any backend that emits these events works with the UI.

## Keyboard shortcuts

| Shortcut              | Action            |
| --------------------- | ----------------- |
| `Enter`               | Send              |
| `Shift + Enter`       | New line          |
| `Cmd/Ctrl + Shift + O`| New chat          |
| `Cmd/Ctrl + B`        | Toggle sidebar    |
| `/`                   | Focus the composer|
| `Esc`                 | Stop generating   |

## Roadmap

- [x] Chat UI and streaming protocol
- [x] FastAPI skeleton with a demo stream
- [ ] Connect a real LLM with streaming
- [ ] Add tools (calculator, current time, web search)
- [ ] Agent loop: call tools until the task is done
- [ ] Conversation memory on the backend
- [ ] Tests and Docker setup
