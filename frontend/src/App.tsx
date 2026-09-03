import { useState, useEffect, useRef } from "react";
import {
  Send,
  Cpu,
  Globe,
  Settings,
  Activity,
  ChevronDown,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Server,
  Info,
  PlusCircle,
  History,
  MessageSquare,
  Loader2,
  Trash2,
  Download,
} from "lucide-react";
import { MarkdownRenderer } from "./components/MarkdownRenderer";
import { generateStandaloneExportHtml, downloadHtmlFile } from "./utils/htmlExport";
import { AlertModal, type ModalAlertProps } from "./components/AlertModal";

interface ToolCallLog {
  id: string;
  toolName: string;
  serverName?: string;
  args: any;
  result?: string;
  timestamp: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallLog[];
  isStreaming?: boolean;
  iterations?: number;
  duration?: number;
  tokensPerSec?: number;
}

interface ConfigState {
  llm: {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  prompts: {
    systemPrompt: string;
    skillsPrompt: string;
  };
  mcpServers: Record<string, any>;
  maxLoopIterations: number;
  tools?: any[];
  discoveredTools?: {
    serverName: string;
    name: string;
    description?: string;
    inputSchema: any;
  }[];
}

export function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your Mini Chat Bot. I can run multi-step reasoning loops and fetch real-time data from the web using MCP tools. What would you like to research or build today?",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [selectedToolDetail, setSelectedToolDetail] = useState<any | null>(null);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [activeSessionFile, setActiveSessionFile] = useState<string | null>(null);
  const [showModelPanel, setShowModelPanel] = useState<boolean>(false);
  const [showPastSessions, setShowPastSessions] = useState<boolean>(true);
  const [mcpViewMode, setMcpViewMode] = useState<"full" | "minimize" | "hide">("full");
  const [mcpJsonText, setMcpJsonText] = useState<string>("");
  const [mcpJsonError, setMcpJsonError] = useState<string | null>(null);
  const [alertPrompt, setAlertPrompt] = useState<Omit<ModalAlertProps, "onClose"> | null>(null);

  const showAlert = (message: string, type: "success" | "error" | "warning" | "info" = "info", title?: string) => {
    setAlertPrompt({
      message,
      type,
      title,
      isConfirm: false,
    });
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    title?: string,
    confirmLabel?: string
  ) => {
    setAlertPrompt({
      message,
      type: "warning",
      title: title || "Confirmation",
      isConfirm: true,
      confirmLabel: confirmLabel || "Confirm",
      onConfirm,
    });
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial configuration and active MCP tools
  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.logs) {
        setSavedSessions(data.logs);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I am your Mini Chat Bot. I can run multi-step reasoning loops and fetch real-time data from the web using MCP tools. What would you like to research or build today?",
      },
    ]);
    setActiveSessionFile(null);
    setInputPrompt("");
    setCurrentStep(null);
  };

  const loadSession = async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/logs/${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setActiveSessionFile(filename);
      }
    } catch (err: any) {
      showAlert(`Failed to load session:\n${err.message || err}`, "error", "Load Session Failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (e: React.MouseEvent, filename: string) => {
    e.stopPropagation(); // prevent triggering loadSession
    showConfirm(
      `確定要刪除以下歷史會話記錄嗎？\n檔名: ${filename}\n\n此操作將從磁碟永久移除，無法復原！`,
      async () => {
        try {
          const res = await fetch(`/api/logs/${encodeURIComponent(filename)}`, {
            method: "DELETE",
          });
          if (res.ok) {
            if (activeSessionFile === filename) {
              startNewChat();
            }
            await fetchLogs();
            showAlert("會話記錄已成功刪除。", "success", "刪除成功");
          } else {
            const data = await res.json();
            showAlert(`刪除失敗: ${data.error || "Unknown error"}`, "error", "刪除失敗");
          }
        } catch (err: any) {
          showAlert(`刪除請求出錯: ${err.message}`, "error", "請求錯誤");
        }
      },
      "永久刪除確認",
      "確認刪除"
    );
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStep]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
      if (data?.mcpServers) {
        setMcpJsonText(JSON.stringify(data.mcpServers, null, 2));
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    let updatedMcpServers = config.mcpServers;
    if (mcpJsonText) {
      try {
        updatedMcpServers = JSON.parse(mcpJsonText);
        setMcpJsonError(null);
      } catch (jsonErr: any) {
        setMcpJsonError(jsonErr.message);
        showAlert(`MCP JSON 語法無效，請修正後再儲存：\n${jsonErr.message}`, "error", "JSON 語法錯誤");
        return;
      }
    }

    const payload = {
      ...config,
      mcpServers: updatedMcpServers,
    };

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setConfig(payload);
        showAlert("系統配置與 MCP 伺服器已成功儲存並完成熱重載！", "success", "配置儲存成功");
        setShowConfig(false);
      }
    } catch (err: any) {
      showAlert(`儲存設定失敗: ${err.message || "網路錯誤"}`, "error", "儲存失敗");
    }
  };

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = async () => {
    if (!inputPrompt.trim() || loading) return;

    const userMessageId = "user-" + Date.now();
    const assistantMessageId = "asst-" + Date.now();
    const query = inputPrompt.trim();

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: query },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        toolCalls: [],
        isStreaming: true,
      },
    ]);

    setInputPrompt("");
    setLoading(true);
    setCurrentStep(1);

    // Format previous messages as multi-turn history (excluding welcome prompt)
    const history = messages
      .filter((m) => m.id !== "welcome" && m.content)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const requestStartTime = Date.now();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, history }),
      });

      if (!response.body) throw new Error("No response body from server");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let activeTools: ToolCallLog[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const eventMatch = line.match(/^event:\s*(\w+)/m);
          const dataMatch = line.match(/^data:\s*(.*)/m);

          const event = eventMatch ? eventMatch[1] : "message";
          let data: any = {};
          if (dataMatch) {
            try {
              data = JSON.parse(dataMatch[1]);
            } catch {
              data = { raw: dataMatch[1] };
            }
          }

          if (event === "step_start") {
            setCurrentStep(data.iteration);
          } else if (event === "tool_call") {
            const toolId = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
            const newTool: ToolCallLog = {
              id: toolId,
              toolName: data.toolName,
              serverName: data.serverName,
              args: data.args,
              timestamp: data.timestamp || Date.now(),
            };
            activeTools.push(newTool);
            setExpandedTools((prev) => ({ ...prev, [toolId]: true }));
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, toolCalls: [...activeTools] }
                  : m
              )
            );
          } else if (event === "tool_result") {
            activeTools = activeTools.map((t) =>
              t.toolName === data.toolName && !t.result
                ? { ...t, result: data.result, serverName: data.serverName || t.serverName }
                : t
            );
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, toolCalls: [...activeTools] }
                  : m
              )
            );
          } else if (event === "complete") {
            const totalDurationSec = Math.max(0.1, (Date.now() - requestStartTime) / 1000);
            const estTokens = Math.round((data.answer?.length || 0) / 3.5);
            const tokensPerSec = Math.round(estTokens / totalDurationSec);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: data.answer,
                      iterations: data.iterations,
                      duration: parseFloat(totalDurationSec.toFixed(1)),
                      tokensPerSec,
                      isStreaming: false,
                    }
                  : m
              )
            );
            fetchLogs(); // refresh saved logs list
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: `[Loop Error]: ${err.message}`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setCurrentStep(null);
    }
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", background: "var(--bg-primary)" }}>
      {/* Sidebar Navigation */}
      <div
        style={{
          width: 320,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), var(--accent-purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Cpu size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>Mini Chat Bot</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--accent)",
                }}
              >
                Port 7000
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>MCP Protocol</span>
            </div>
          </div>
        </div>

        {/* New Chat Primary Action Button */}
        <button
          onClick={startNewChat}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <PlusCircle size={16} /> New Chat
        </button>

        {/* Collapsible Past Sessions Section (Matching Active Model Card Style) */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            marginBottom: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            flex: showPastSessions ? 1 : "0 0 auto",
            minHeight: showPastSessions ? 140 : "auto",
            transition: "flex 0.2s ease, min-height 0.2s ease",
          }}
        >
          {/* Collapsible Header bar: Matches Active Model Header Style */}
          <div
            onClick={() => setShowPastSessions(!showPastSessions)}
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              background: showPastSessions ? "var(--bg-secondary)" : "transparent",
              userSelect: "none",
              borderBottom: showPastSessions ? "1px solid var(--border-color)" : "none",
            }}
            title="Click to collapse / expand past sessions"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <History size={14} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
                Past Sessions
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Refresh icon button on the left of Logs badge */}
              <span
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px",
                  borderRadius: 4,
                  color: "var(--text-muted)",
                  transition: "color 0.15s",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  fetchLogs();
                }}
                title="Refresh saved sessions"
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <RefreshCw size={11} />
              </span>

              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(37, 99, 235, 0.1)",
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                {savedSessions.length} Logs
              </span>

              {showPastSessions ? (
                <ChevronDown size={15} color="var(--text-muted)" />
              ) : (
                <ChevronRight size={15} color="var(--text-muted)" />
              )}
            </div>
          </div>

          {/* Collapsible Sessions Body */}
          {showPastSessions && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                overflowY: "auto",
                flex: 1,
                padding: "10px 12px",
              }}
            >
              {savedSessions.length === 0 ? (
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", padding: "4px 0" }}>
                  No past logs yet.
                </div>
              ) : (
                savedSessions.map((session) => {
                  const isActive = activeSessionFile === session.filename;
                  return (
                    <div
                      key={session.filename}
                      onClick={() => loadSession(session.filename)}
                      title={`Click to load: ${session.filename}`}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: "pointer",
                        background: isActive ? "rgba(37, 99, 235, 0.12)" : "var(--bg-secondary)",
                        border: isActive ? "1px solid var(--accent)" : "1px solid var(--border-color)",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = "var(--text-muted)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.borderColor = "var(--border-color)";
                      }}
                    >
                      {/* First Line: Title (Prompt Preview) & Delete Button */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: "var(--text-main)", flex: 1, minWidth: 0 }}>
                          <MessageSquare size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 12,
                            }}
                          >
                            {session.preview || "Untitled Conversation"}
                          </span>
                        </div>

                        {/* Delete Icon Button */}
                        <button
                          onClick={(e) => deleteSession(e, session.filename)}
                          title="Delete this session"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 4px",
                            borderRadius: 4,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            transition: "color 0.15s, background-color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#ef4444";
                            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--text-muted)";
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Second Line: Filename / Timestamp */}
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, paddingLeft: 17, fontFamily: "monospace" }}>
                        {session.filename.replace(".md", "")}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Collapsible Active Model & Tools Container at Bottom */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            marginBottom: 12,
            overflow: "hidden",
            transition: "flex 0.2s ease",
            display: "flex",
            flexDirection: "column",
            flex: showModelPanel ? 1 : "0 0 auto",
          }}
        >
          {/* Collapsible Header bar: Shows 'Active Model' when collapsed */}
          <div
            onClick={() => setShowModelPanel(!showModelPanel)}
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              background: showModelPanel ? "var(--bg-secondary)" : "transparent",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={14} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
                Active Model {showModelPanel ? "" : `(${config?.llm.model || "Loading..."})`}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {!showModelPanel && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(37, 99, 235, 0.1)",
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  {config?.tools?.length || 0} Tools
                </span>
              )}
              {showModelPanel ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
            </div>
          </div>

          {/* Expanded Content: Model Details + Active MCP Tools */}
          {showModelPanel && (
            <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>CURRENT LLM MODEL</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Cpu size={14} /> {config?.llm.model || "Loading..."}
              </div>

              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>ACTIVE MCP SERVERS</span>
                <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>{config?.tools?.length || 0} Tools</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
                {config?.mcpServers &&
                  Object.entries(config.mcpServers).map(([serverKey, serverDef]: [string, any]) => {
                    const serverTools = (config.discoveredTools || []).filter(
                      (t) => t.serverName === serverKey
                    );

                    return (
                      <div
                        key={serverKey}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: 6,
                          padding: "6px 8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Server size={12} color="var(--accent)" />
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-main)" }}>
                              {serverKey}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "1px 4px",
                              borderRadius: 3,
                              background: serverDef.enabled ? "rgba(22, 163, 74, 0.15)" : "var(--bg-card)",
                              color: serverDef.enabled ? "var(--accent-emerald)" : "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            {serverDef.enabled ? "Active" : "Off"}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {serverTools.length > 0 ? (
                            serverTools.map((t) => (
                              <div
                                key={t.name}
                                onClick={() =>
                                  setSelectedToolDetail({
                                    ...t,
                                    serverDef,
                                  })
                                }
                                title="Click to view tool details"
                                style={{
                                  fontSize: 10,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 4,
                                  color: "var(--text-main)",
                                  background: "var(--bg-card)",
                                  padding: "2px 5px",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                }}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <Globe size={10} color="var(--accent-emerald)" />
                                  <code>{t.name}</code>
                                </span>
                                <Info size={11} color="var(--text-muted)" />
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
                              No tools loaded
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowConfig(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 6,
            background: "var(--bg-card)",
            color: "var(--text-main)",
            border: "1px solid var(--border-color)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <Settings size={16} /> Configure LLM & AI Skills
        </button>
      </div>

      {/* Main Chat & Loop Trace Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <header
          style={{
            height: 60,
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "var(--bg-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent-emerald)",
                boxShadow: "0 0 8px rgba(22, 163, 74, 0.6)",
              }}
              title="Agent Engine Online"
            />
            <Activity size={16} color="var(--accent-emerald)" />
            {currentStep && (
              <span
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Iterating: Step {currentStep}
              </span>
            )}
          </div>

          {/* MCP Response View Mode Segmented Switch */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--bg-card)",
                padding: "3px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "0 6px" }}>
                MCP Response:
              </span>

              {/* 1. Hide */}
              <button
                type="button"
                onClick={() => setMcpViewMode("hide")}
                title="Hide all MCP tool calls completely"
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: mcpViewMode === "hide" ? 700 : 500,
                  background: mcpViewMode === "hide" ? "var(--bg-secondary)" : "transparent",
                  color: mcpViewMode === "hide" ? "var(--text-main)" : "var(--text-muted)",
                  boxShadow: mcpViewMode === "hide" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <EyeOff size={12} /> Hide
              </button>

              {/* 2. Minimize */}
              <button
                type="button"
                onClick={() => setMcpViewMode("minimize")}
                title="Show only tool summary pill / single line"
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: mcpViewMode === "minimize" ? 700 : 500,
                  background: mcpViewMode === "minimize" ? "var(--bg-secondary)" : "transparent",
                  color: mcpViewMode === "minimize" ? "var(--accent-amber)" : "var(--text-muted)",
                  boxShadow: mcpViewMode === "minimize" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ChevronDown size={12} /> Minimize
              </button>

              {/* 3. Full */}
              <button
                type="button"
                onClick={() => setMcpViewMode("full")}
                title="Show full collapsible tool call cards with parameters and raw observations"
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: mcpViewMode === "full" ? 700 : 500,
                  background: mcpViewMode === "full" ? "var(--bg-secondary)" : "transparent",
                  color: mcpViewMode === "full" ? "var(--accent)" : "var(--text-muted)",
                  boxShadow: mcpViewMode === "full" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Eye size={12} /> Full
              </button>
            </div>

            {/* Export Entire Conversation as HTML */}
            <button
              onClick={() => {
                const combinedMarkdown = messages
                  .map((m) => `### ${m.role === "user" ? "👤 User Query" : "🤖 Assistant Response"}\n\n${m.content}`)
                  .join("\n\n---\n\n");
                const html = generateStandaloneExportHtml(
                  combinedMarkdown,
                  activeSessionFile ? activeSessionFile.replace(".md", "") : "Chat Session Export"
                );
                downloadHtmlFile(
                  html,
                  activeSessionFile ? `${activeSessionFile.replace(".md", "")}.html` : `chat-session-${Date.now()}.html`
                );
              }}
              title="Export complete chat session as standalone offline HTML report"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.color = "var(--text-main)";
              }}
            >
              <Download size={13} /> Export HTML
            </button>
          </div>
        </header>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 30px", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {m.role === "user" ? (
                <div
                  style={{
                    background: "#1f6feb",
                    color: "#fff",
                    padding: "12px 18px",
                    borderRadius: "16px 16px 2px 16px",
                    maxWidth: "75%",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </div>
              ) : (
                <div style={{ maxWidth: "85%", width: "100%" }}>                  {/* Tool Invocations Section governed by mcpViewMode */}
                  {m.toolCalls && m.toolCalls.length > 0 && mcpViewMode !== "hide" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {/* If Minimize mode: show a compact summary bar */}
                      {mcpViewMode === "minimize" ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px",
                            borderRadius: 20,
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            fontSize: 11,
                            color: "var(--text-muted)",
                            width: "fit-content",
                          }}
                        >
                          <Activity size={12} color="var(--accent-amber)" />
                          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                            {m.toolCalls.length} MCP Tool Call(s) Executed
                          </span>
                          <span style={{ color: "var(--text-muted)" }}>•</span>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {m.toolCalls.map((t, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  background: "var(--bg-secondary)",
                                  border: "1px solid var(--border-color)",
                                  fontSize: 10,
                                  fontFamily: "monospace",
                                  color: "var(--accent-amber)",
                                }}
                              >
                                {t.toolName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* If Full mode: render interactive collapsible tool cards */
                        m.toolCalls.map((t) => {
                          const isExpanded = !!expandedTools[t.id];
                          return (
                            <div
                              key={t.id}
                              style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-color)",
                                borderRadius: 8,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                onClick={() => toggleTool(t.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "10px 14px",
                                  cursor: "pointer",
                                  background: "var(--bg-secondary)",
                                  borderBottom: isExpanded ? "1px solid var(--border-color)" : "none",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <Search size={15} color="var(--accent-amber)" />
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-amber)" }}>
                                    Tool Call: {t.toolName}
                                  </span>
                                  {t.serverName && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                        background: "rgba(2, 132, 199, 0.12)",
                                        color: "var(--accent)",
                                        border: "1px solid rgba(2, 132, 199, 0.25)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <Server size={10} /> {t.serverName}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                    args: {JSON.stringify(t.args)}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {t.result ? (
                                    <span style={{ fontSize: 11, color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: 4 }}>
                                      <CheckCircle2 size={13} /> Completed
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 11, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                                      <RefreshCw size={12} className="spin" /> Executing...
                                    </span>
                                  )}
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div style={{ padding: "12px 14px", background: "var(--bg-card)" }}>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>PARAMETERS:</div>
                                  <pre style={{ fontSize: 12, color: "var(--accent)", marginBottom: 10, overflowX: "auto", background: "var(--bg-primary)", padding: 8, borderRadius: 6, border: "1px solid var(--border-color)" }}>
                                    {JSON.stringify(t.args, null, 2)}
                                  </pre>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>OBSERVATION (MCP RESPONSE):</div>
                                  <pre
                                    style={{
                                      fontSize: 12,
                                      color: "var(--text-main)",
                                      maxHeight: 200,
                                      overflowY: "auto",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      background: "var(--bg-primary)",
                                      padding: 8,
                                      borderRadius: 6,
                                      border: "1px solid var(--border-color)",
                                    }}
                                  >
                                    {t.result || "Awaiting MCP response..."}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Main Assistant Content */}
                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "16px 16px 16px 2px",
                      padding: "16px 20px",
                      color: "var(--text-main)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    {m.content ? (
                      <>
                        <MarkdownRenderer content={m.content} />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginTop: 12,
                            paddingTop: 8,
                            borderTop: "1px solid var(--border-color)",
                            fontSize: 11,
                            color: "var(--text-muted)",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>Tokens: ~{Math.round(m.content.length / 3.5)}</span>
                          <span>Length: {m.content.length} chars</span>
                          {m.duration !== undefined && (
                            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                              ⏱️ Time: {m.duration}s
                            </span>
                          )}
                          {m.tokensPerSec !== undefined && (
                            <span style={{ color: "#8b5cf6", fontWeight: 600 }}>
                              ⚡ Speed: ~{m.tokensPerSec} T/s
                            </span>
                          )}
                          {m.iterations && (
                            <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                              Resolved in {m.iterations} iteration(s)
                            </span>
                          )}

                          <button
                            onClick={() => {
                              const title = m.content.slice(0, 40).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "-") || "Answer";
                              const html = generateStandaloneExportHtml(m.content, title);
                              downloadHtmlFile(html, `${title}.html`);
                            }}
                            title="Export this specific answer as standalone HTML"
                            style={{
                              marginLeft: "auto",
                              background: "transparent",
                              border: "1px solid var(--border-color)",
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "var(--accent)";
                              e.currentTarget.style.color = "var(--accent)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border-color)";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                          >
                            <Download size={11} /> Export HTML
                          </button>
                        </div>
                      </>
                    ) : m.isStreaming ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontStyle: "italic", fontSize: 13 }}>
                        <Loader2 size={16} className="spin" color="var(--accent)" />
                        <span>Reasoning through tool outputs...</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "16px 30px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            display: "flex",
            gap: 12,
          }}
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything (e.g. 'Search for the latest news on Model Context Protocol')..."
            disabled={loading}
            style={{
              flex: 1,
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              padding: "12px 16px",
              color: "var(--text-main)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputPrompt.trim()}
            style={{
              padding: "0 22px",
              borderRadius: 8,
              background: loading ? "#94a3b8" : "#1f6feb",
              color: "#ffffff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
              boxShadow: loading ? "none" : "0 2px 4px rgba(31, 111, 235, 0.25)",
              transition: "background 0.2s, box-shadow 0.2s",
            }}
          >
            <Send size={16} /> Send
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfig && config && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "min(1160px, 95vw)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: 14,
              padding: 28,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-main)" }}>Configuration & AI Skills</h3>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Adjust Model parameters, prompt instructions, and hot-reload MCP tools in real-time.
                </div>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* 2-Column Split: Left = System Prompts & LLM Settings | Right = MCP Servers JSON */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                alignItems: "stretch",
              }}
            >
              {/* Left Column: LLM Settings & System Prompts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                      LLM Base URL
                    </label>
                    <input
                      type="text"
                      value={config.llm.baseUrl}
                      onChange={(e) =>
                        setConfig({ ...config, llm: { ...config.llm, baseUrl: e.target.value } })
                      }
                      style={{
                        width: "100%",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        padding: "8px 12px",
                        borderRadius: 6,
                        color: "var(--text-main)",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                      LLM Model Name
                    </label>
                    <input
                      type="text"
                      value={config.llm.model}
                      onChange={(e) =>
                        setConfig({ ...config, llm: { ...config.llm, model: e.target.value } })
                      }
                      style={{
                        width: "100%",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        padding: "8px 12px",
                        borderRadius: 6,
                        color: "var(--text-main)",
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>

                {/* API Key Input with Eye Toggle */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    API Key (MiniMax / LLM Secret)
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={config.llm.apiKey || ""}
                      onChange={(e) =>
                        setConfig({ ...config, llm: { ...config.llm, apiKey: e.target.value } })
                      }
                      placeholder="sk-cp-..."
                      style={{
                        width: "100%",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        padding: "8px 40px 8px 12px",
                        borderRadius: 6,
                        color: "var(--text-main)",
                        fontSize: 13,
                        fontFamily: showApiKey ? "ui-monospace, monospace" : "inherit",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => !prev)}
                      title={showApiKey ? "Hide API Key" : "Show API Key"}
                      style={{
                        position: "absolute",
                        right: 8,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 4,
                        borderRadius: 4,
                      }}
                    >
                      {showApiKey ? <EyeOff size={16} color="var(--accent)" /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    System Prompt
                  </label>
                  <textarea
                    rows={5}
                    value={config.prompts.systemPrompt}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        prompts: { ...config.prompts, systemPrompt: e.target.value },
                      })
                    }
                    placeholder="Enter the system behavior instructions..."
                    style={{
                      width: "100%",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      padding: 10,
                      borderRadius: 6,
                      color: "var(--text-main)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    AI Skills & Protocols Prompt
                  </label>
                  <textarea
                    rows={6}
                    value={config.prompts.skillsPrompt}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        prompts: { ...config.prompts, skillsPrompt: e.target.value },
                      })
                    }
                    placeholder="Enter skills and reasoning protocols..."
                    style={{
                      width: "100%",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      padding: 10,
                      borderRadius: 6,
                      color: "var(--text-main)",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                      lineHeight: 1.5,
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Active MCP Servers Registry JSON */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                    Active MCP Servers Registry (Flexible JSON)
                  </label>
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Hot-reloaded automatically</span>
                </div>
                <textarea
                  value={mcpJsonText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMcpJsonText(val);
                    try {
                      JSON.parse(val);
                      setMcpJsonError(null);
                    } catch (err: any) {
                      setMcpJsonError(err.message);
                    }
                  }}
                  placeholder='{\n  "server-name": {\n    "command": "node",\n    "args": [...],\n    "enabled": true\n  }\n}'
                  spellCheck={false}
                  style={{
                    flex: 1,
                    minHeight: 330,
                    width: "100%",
                    background: "var(--bg-primary)",
                    border: mcpJsonError ? "1px solid var(--accent-rose, #ef4444)" : "1px solid var(--border-color)",
                    padding: 12,
                    borderRadius: 6,
                    color: "var(--accent-emerald)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    resize: "vertical",
                  }}
                />
                {mcpJsonError ? (
                  <div style={{ fontSize: 11, color: "#f87171", marginTop: 6, lineHeight: 1.3 }}>
                    ⚠️ Syntax error: {mcpJsonError}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>
                    💡 Plug in any MCP server here (e.g. SQLite, GitHub, Brave Search, Filesystem, or Custom Python/Node scripts).
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 6,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                style={{
                  padding: "9px 20px",
                  borderRadius: 6,
                  background: "#1f6feb",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: "0 2px 4px rgba(31, 111, 235, 0.25)",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tool & Server Config Inspector Modal */}
      {selectedToolDetail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              width: "min(680px, 90vw)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: 12,
              padding: 24,
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={18} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
                  {selectedToolDetail.name}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "rgba(2, 132, 199, 0.15)",
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  Server: {selectedToolDetail.serverName}
                </span>
              </div>
              <button
                onClick={() => setSelectedToolDetail(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 18,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                DESCRIPTION
              </div>
              <div style={{ fontSize: 13, color: "var(--text-main)", background: "var(--bg-card)", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-color)" }}>
                {selectedToolDetail.description || "No description provided."}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                HOST MCP SERVER CONFIGURATION
              </div>
              <pre
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 12,
                  color: "var(--accent)",
                  fontFamily: "ui-monospace, monospace",
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(selectedToolDetail.serverDef, null, 2)}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                INPUT SCHEMA (PARAMETERS DEFINITION)
              </div>
              <pre
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 12,
                  color: "var(--accent-emerald)",
                  fontFamily: "ui-monospace, monospace",
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {JSON.stringify(selectedToolDetail.inputSchema, null, 2)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button
                onClick={() => setSelectedToolDetail(null)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 6,
                  background: "#1f6feb",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLS Style Alert / Confirm Dialog */}
      {alertPrompt && (
        <AlertModal
          {...alertPrompt}
          onClose={() => setAlertPrompt(null)}
        />
      )}
    </div>
  );
}

export default App;
