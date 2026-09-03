# Chapter 10: BigFix Enterprise Streamable-HTTP MCP Integration
## 企業級 BigFix Streamable-HTTP MCP 整合架構與設定規格

本章詳細記錄如何在 **Mini Chat Bot（Loop Engineering 架構）** 中，實現對企業級端點管理平台 **HCL BigFix** 的遠端 MCP 連接與動態呼叫，涵蓋 HTTPS 自簽憑證容錯、SSE（Server-Sent Events）串流協定處理、Session ID 管理以及具體呼叫 Prompt 語法。

---

## 一、架構背景與協議分析

### 1. 什麼是 BigFix Streamable-HTTP MCP？
傳統 MCP 通常使用本機子程序管道（Stdio Transport），例如 `node dist/mcp/servers/...`。然而，在企業內網運維場景中，BigFix MCP Server 是運行於獨立伺服器（例如 `https://172.22.29.51:9494/mcp`）的遠端微服務。

### 2. 核心協議特徵（Protocol Characteristics）
在對 `https://172.22.29.51:9494/mcp` 進行網路剖析時，發現其具備以下規範：
* **雙重 Accept 標頭約束**：伺服器要求 HTTP 請求的 `Accept` 必須同時包含：  
  `Accept: application/json, text/event-stream`。
* **會話維持（Stateful Session ID）**：在初次握手（`initialize`）時，伺服器於 Response Header 回傳 `mcp-session-id: <SESSION_ID>`。後續所有 JSON-RPC 請求（如 `tools/list`、`tools/call`）皆必須攜帶 `Mcp-Session-Id` Header。
* **企業級憑證容錯（Self-Signed SSL）**：企業內網常使用私有 CA 或自簽憑證，客戶端必須支援 `rejectUnauthorized: false`（可配置 `strictSSL: false`）。

---

## 二、整合架構與序列時序圖

```mermaid
sequenceDiagram
    autonumber
    actor User as 使用者 / 前端
    participant Server as Mini Chat Bot (Port 7000)
    participant ClientMgr as MCPClientManager
    participant BigFixClient as BigFixStreamableHttpClient
    participant RemoteBF as BigFix Platform (172.22.29.51:9494)

    Note over Server,RemoteBF: 伺服器啟動初始化階段
    Server->>ClientMgr: initialize(config.mcpServers)
    ClientMgr->>BigFixClient: new BigFixStreamableHttpClient(url, token, headers)
    BigFixClient->>RemoteBF: POST /mcp [method: "initialize", Accept: "application/json, text/event-stream"]
    RemoteBF-->>BigFixClient: HTTP 200 [Header: Mcp-Session-Id, Body: serverInfo]
    BigFixClient->>RemoteBF: POST /mcp [notifications/initialized]
    BigFixClient->>RemoteBF: POST /mcp [method: "tools/list", Header: Mcp-Session-Id]
    RemoteBF-->>BigFixClient: 回傳 14 個 BigFix 核心工具定義
    BigFixClient-->>ClientMgr: 註冊 14 個 Tools (OpenAI Functions)

    Note over User,RemoteBF: 使用者即時問答階段
    User->>Server: "請查詢 BigFix 上的電腦資產清單"
    Server->>Server: LLM 產生 tool_call: manage_bigfix_computers(operation="listComputers")
    Server->>ClientMgr: executeTool("manage_bigfix_computers", args)
    ClientMgr->>BigFixClient: callTool("manage_bigfix_computers", args)
    BigFixClient->>RemoteBF: POST /mcp [method: "tools/call", args]
    RemoteBF-->>BigFixClient: 回傳即時端點電腦 JSON/XML 資料
    BigFixClient-->>ClientMgr: Observation 數據
    ClientMgr-->>Server: 注入 LLM 上下文
    Server-->>User: 格式化輸出電腦資產總結報告
```

---

## 三、具體配置設定（`loop.config.json`）

在專案主設定檔 [`loop.config.json`](../loop.config.json) 中加入以下設定即可隨時啟用或調用：

```json
{
  "llm": {
    "baseUrl": "https://api.minimaxi.com/v1",
    "apiKey": "${LLM_API_KEY}",
    "model": "MiniMax-M3",
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "prompts": {
    "systemPrompt": "You are an expert Mini Chat Bot Assistant. You have access to external tools via the Model Context Protocol (MCP), including real-time web search, multimodal services, and BigFix enterprise endpoint management. When the user asks a question that requires real-time facts, BigFix queries (computers, fixlets, actions, baselines), or external data, inspect available tools, call them, analyze the result, and iteratively determine if additional steps are required before delivering your final answer.",
    "skillsPrompt": "## AI Skills & Protocols:\n- Web Search & Retrieval: When looking up current events, documentation, or technical information, use the `web_search` or `fetch_page` MCP tools.\n- BigFix Platform Management: Use BigFix MCP tools (e.g. `manage_bigfix_query`, `manage_bigfix_computers`, `manage_bigfix_fixlets`, `manage_bigfix_actions`) to query endpoint status, computer assets, and patch compliance.\n- Iterative Loop: Do not guess or hallucinate. Use tool calls to verify facts.\n- Summarization: Synthesize findings cleanly with markdown formatting."
  },
  "mcpServers": {
    "web-search": {
      "command": "node",
      "args": ["dist/mcp/servers/web-search-server.js"],
      "enabled": true,
      "description": "Provides internet web search and page content fetching capabilities"
    },
    "minimax-multimodal": {
      "command": "node",
      "args": ["dist/mcp/servers/minimax-server.js"],
      "enabled": true,
      "description": "Provides MiniMax official web search, image generation, speech synthesis, and music creation via mmx-cli"
    },
    "bigfix": {
      "type": "streamable-http",
      "url": "https://172.22.29.51:9494/mcp",
      "headers": {
        "Authorization": "Bearer 9qdVuQuIkXazX7eRa9s98LRB10VlXsze5uuYTQAAAAI",
        "X-Bes-Mcp-Read-Only": "true",
        "X-Bes-Mcp-Disable-Hitl": "false"
      },
      "strictSSL": false,
      "enabled": true,
      "description": "Enterprise BigFix Platform Endpoint Management MCP Server (Computers, Fixlets, Actions, Relevance Query)"
    }
  },
  "maxLoopIterations": 10
}
```

---

## 四、發現的 14 個 BigFix 核心工具清單

| 工具名稱 (Tool Name) | 核心用途 | 典型 operation 參數值 |
|---|---|---|
| **`manage_bigfix_computers`** | 管理與查詢電腦資產清單 | `listComputers`, `getComputerDetails`, `getComputerByName` |
| **`manage_bigfix_fixlets`** | 查詢與檢視漏洞 Fixlets 與修補程式 | `listFixlets`, `getFixletDetails` |
| **`manage_bigfix_actions`** | 檢視派送 Action 狀態與進度 | `listActions`, `getActionDetails` |
| **`manage_bigfix_analyses`** | 收集端點屬性與分析資料 | `listAnalyses`, `getAnalysisDetails` |
| **`manage_bigfix_baselines`** | 基準線管理與合規檢查 | `listBaselines`, `getBaselineDetails` |
| **`manage_bigfix_query`** | 執行即時 BigFix Client Relevance 查詢 | Relevance 查詢字串 |
| **`manage_bigfix_sites`** | 訂閱的 External 與 Custom Sites | `listSites`, `getSiteDetails` |
| **`manage_bigfix_tasks`** | 維運與自動化 Task 查詢 | `listTasks`, `getTaskDetails` |
| **`manage_bigfix_operators`** | 檢視操作員帳號與權限 | `listOperators`, `getOperatorDetails` |
| **`manage_bigfix_roles`** | 角色與授權管理 | `listRoles` |
| **`manage_bigfix_idp`** | 身分驗證與 IDP 整合 | `getIdpSettings` |
| **`manage_bigfix_ldap`** | 企業目錄服務 (LDAP) 整合 | `getLdapDirectories` |
| **`manage_bigfix_session`** | BigFix 操作會話狀態 | `getSessionInfo` |
| **`get_bigfix_schema`** | 取得 XSD 資料結構模型與語意文檔 | 實體名稱（如 Computer, Fixlet） |

---

## 五、推薦測試 Prompts（How to Trigger）

若要百分之百準確觸發 BigFix 工具，請在問題中明確帶有 **"BigFix"** 或相應工具的關鍵字：

* **電腦清單查詢**：
  > *"Use the `manage_bigfix_computers` tool with operation 'listComputers' to retrieve all registered endpoints in our BigFix environment."*
* **安全補丁與 Fixlet 檢查**：
  > *"Check our BigFix server and list all available critical security Fixlets."*
* **端點健康與跨 MCP 診斷（BigFix + 網絡搜尋）**：
  > *"1. Call BigFix tool to list all managed computers. 2. For the detected OS versions, search the web for recent CVE advisories in 2026. 3. Synthesize a comprehensive security report."*
