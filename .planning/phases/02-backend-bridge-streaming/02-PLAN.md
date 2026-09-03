# Phase 2 Plan: Stateful Memory for LLM & Context Window Management

## Phase Goal
Transform the Loop Engineering Chatbot from a single-turn query engine into a fully stateful, conversational AI assistant with multi-turn memory recall, session persistence via markdown logs, and an interactive sidebar session browser.

---

## Architecture & Data Contracts

### 1. Multi-turn Payload Schema (`POST /api/chat`)
```typescript
interface ChatRequestPayload {
  message: string;
  sessionId?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}
```

### 2. Log Browser Endpoints
- `GET /api/logs`: Returns an array of available markdown logs ordered by timestamp descending.
  ```json
  [
    {
      "filename": "2026-09-03_11-20-56.md",
      "timestamp": "2026-09-03T03:20:56.000Z",
      "preview": "Has an existing CA server with an old HSM...",
      "iterations": 10,
      "toolCount": 10
    }
  ]
  ```
- `GET /api/logs/:filename`: Returns the parsed session with `messages: Message[]` and metadata, ready to be loaded into the React state.

---

## Task Breakdown

### Task 1: Extend `LoopOrchestrator` for Multi-Turn History Injection
- **Files**: `src/engine/loop-orchestrator.ts`
- **Changes**:
  - Update `run(userPrompt: string, callbacks?: LoopEventCallbacks, history?: Array<{ role: "user" | "assistant"; content: string }>)`
  - In `messages` initialization:
    - Prepend `system` prompt
    - Append each valid `history` turn (`role: "user" | "assistant"`)
    - Append current `userPrompt`
  - Ensure tool calls and iterations within the current turn reference the full multi-turn context.

### Task 2: Backend Log Discovery & Session Parser APIs
- **Files**: `src/logger/conversation-logger.ts`, `src/server.ts`
- **Changes**:
  - In `conversation-logger.ts`:
    - Add `listConversationLogs()`: Scans `logs/` directory for `*.md`, extracts frontmatter/metadata (date, prompt preview, iterations).
    - Add `parseConversationLog(filename: string)`: Reads markdown log and converts it back into structured `Message[]` and `ToolCallLog[]`.
  - In `src/server.ts`:
    - Expose `GET /api/logs` (returns list).
    - Expose `GET /api/logs/:filename` (returns parsed session).
    - Update `POST /api/chat` to accept `history` and `sessionId`, passing `history` to `orchestrator.run()`.

### Task 3: Frontend Multi-Turn Memory & UI Controls
- **Files**: `frontend/src/App.tsx`, `frontend/src/index.css`
- **Changes**:
  - **Multi-Turn Context in Chat**:
    - Update `sendMessage` to pass `history: messages.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content }))`.
  - **"New Chat" Action**:
    - Add a primary "+ New Chat" button in the sidebar to reset `messages` state to the welcome greeting.
  - **"Past Sessions" Sidebar Browser**:
    - Fetch `/api/logs` on mount and after each completed conversation.
    - Render a list of past sessions in the sidebar with timestamps and prompt previews.
    - Clicking a session loads the past messages and tool calls directly into the active chat window to resume the discussion.
  - **Token / Character Metric**:
    - Display estimated character / token count badge in message bubbles.

---

## Verification Plan

### Automated Verification
1. Build TypeScript backend: `npm run build`
2. Build Vite React frontend: `cd frontend && npm run build`
3. API Test:
   - `GET /api/logs` returns JSON array with existing logs (`2026-09-03_11-20-56.md`, etc.).
   - `GET /api/logs/2026-09-03_11-20-56.md` returns parsed messages.

### Manual Verification
1. Open `http://localhost:7000`.
2. Turn 1: Ask `"I have 300 servers and 1000 clients running AD CS. Remember this."`
3. Turn 2: Follow up with `"How many servers did I mention earlier?"` ➜ Verify assistant responds with "300 servers".
4. Click "+ New Chat" ➜ Verify conversation resets to blank welcome screen.
5. Click a past session in the "Past Sessions" sidebar ➜ Verify past conversation and tool calls re-populate the chat window.
