# Phase 2 Context: Stateful Memory for LLM & Context Window Management

## 1. User Choices & Architectural Decisions

### 1.1 Memory & Storage Architecture
- **Decision**: **Hybrid Architecture (Memory + File Persistence)**
  - **Client-Side (Runtime Memory)**: React 19 state (`messages[]`) maintains the live, real-time conversation thread for zero-latency interactions.
  - **Server-Side (Payload Transmission)**: Frontend sends `history: Message[]` alongside the new `message` query to `POST /api/chat`.
  - **Orchestrator Level**: `LoopOrchestrator` prepends `history` into the OpenAI `messages` array so the LLM has complete multi-turn conversational context.
  - **File-Based Persistence**: Each completed conversation session is saved and appended in `logs/YYYY-MM-DD_HH-mm-ss.md`.

### 1.2 Context Window Governance Strategy
- **Decision**: **Full Context Preservation (No Arbitrary Truncation)**
  - Capitalizes on MiniMax's large context window (128k / 1M tokens) to preserve the entire conversation history without losing early constraints or instructions.
  - `history` is mapped cleanly to `{ role: "user" | "assistant", content: string }`.

### 1.3 Web UI Features
- **New Chat Button**:
  - Located in the sidebar / header to reset the in-memory React state and start a fresh session.
- **History Session Browser (Sidebar List)**:
  - New backend endpoint: `GET /api/logs` (returns list of markdown logs with timestamp, model, turn count).
  - New backend endpoint: `GET /api/logs/:filename` (reads and parses the markdown file back into structured `Message[]`).
  - Clicking a historical session in the sidebar loads the past conversation into the chat interface to resume the discussion seamlessly.
- **Token & Cost Metrics**:
  - Displays token count / estimation on the message bubbles and in the status bar so users can monitor context utilization.

---

## 2. API & Data Contracts

### 2.1 Extended `/api/chat` (SSE Request)
```json
{
  "message": "Current user query",
  "sessionId": "2026-09-03_11-20-56", // Optional: to append to an existing log
  "history": [
    {
      "role": "user",
      "content": "Previous question..."
    },
    {
      "role": "assistant",
      "content": "Previous answer..."
    }
  ]
}
```

### 2.2 History Logs API
- `GET /api/logs`: Returns `[{ filename: string, timestamp: string, preview: string, iterations: number }]`
- `GET /api/logs/:filename`: Returns the structured session representation.

---

## 3. Implementation Steps for Next Phase

1. **Backend Orchestrator Extension**:
   - Update `LoopOrchestrator.run(userPrompt, callbacks, history?: Message[])` to inject past conversation turns between system prompt and user query.
2. **Backend Server (`src/server.ts`)**:
   - Accept `history` and `sessionId` in `POST /api/chat`.
   - Add `GET /api/logs` and `GET /api/logs/:id` to browse and load past conversation markdown files.
3. **Frontend React UI (`frontend/src/App.tsx`)**:
   - Update `sendMessage` to pass `history: messages` in the fetch request.
   - Add "New Chat" button to wipe active memory.
   - Add "History Sessions" sidebar section to list and reload past `.md` logs.
   - Add token usage indicators in message bubble footers.
4. **Verification**:
   - Ask a question (e.g. "I have 300 servers"), get answer, then ask follow-up ("How many servers did I mention earlier?") to verify stateful recall.
   - Click "New Chat" and verify context resets.
   - Click a historical log and verify it loads back into the chat window.
