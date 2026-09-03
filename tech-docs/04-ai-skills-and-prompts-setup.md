# AI Skills Setup & Dynamic Injection Specification

## 1. Concept of "AI Skills"
In this architecture, an **AI Skill** is a structured markdown declaration that teaches the LLM:
1. When to invoke specific MCP tools.
2. How to validate inputs and format arguments.
3. What verification steps to take before declaring an answer final.
4. Error recovery workflows when external tools return failures (e.g., HTTP 403 / 401).

Unlike hardcoded programmatic logic, AI Skills allow prompt engineers to adjust agent behavior without restarting or recompiling the host application.

---

## 2. Ingestion Format & Configuration
Configured in `loop.config.json` or `.env`:
```json
{
  "prompts": {
    "systemPrompt": "You are an expert Loop Engineering Assistant...",
    "skillsPrompt": "## AI Skills & Protocols:\n- Web Search & Retrieval: When looking up current events, documentation, or technical information, use the `web_search` or `fetch_page` MCP tools.\n- Iterative Loop: Do not guess or hallucinate. Use tool calls to verify facts.\n- Summarization: Synthesize findings cleanly with markdown formatting."
  }
}
```

### Dynamic Injection Mechanism
In `src/engine/loop-orchestrator.ts`:
```typescript
const fullSystemPrompt = [
  this.config.prompts.systemPrompt,
  "\n--- Active AI Skills & Instructions ---\n",
  this.config.prompts.skillsPrompt,
].join("\n");

const messages = [
  { role: "system", content: fullSystemPrompt },
  { role: "user", content: userPrompt }
];
```

---

## 3. Integrating the MiniMax Multimodal Toolkit (`mmx-cli`)
We installed the official `minimax-multimodal-toolkit` skill located at:
`C:\Users\billy.kp.lam\.gemini\config\skills\minimax-multimodal-toolkit\SKILL.md`

### Command Mapping for Future MCP Extension
| Modality | CLI Command | Target MCP Tool Spec |
|---|---|---|
| **Web Search** | `mmx search query --query <str>` | `minimax_search(query)` |
| **Image Gen** | `mmx image generate --prompt <str>` | `generate_image(prompt, aspect_ratio)` |
| **Video Gen** | `mmx video generate --prompt <str>` | `generate_video(prompt, model)` |
| **Speech TTS** | `mmx speech synthesize --text <str>` | `synthesize_speech(text, voice)` |
| **Music Gen** | `mmx music generate --prompt <str>` | `generate_music(prompt, genre)` |

To enable these as MCP tools, an MCP wrapper server can execute `mmx` via child processes and return generated media URLs/paths back to the loop orchestrator.
