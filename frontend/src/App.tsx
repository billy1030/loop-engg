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
} from "lucide-react";
import { MarkdownRenderer } from "./components/MarkdownRenderer";

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
    } catch (err) {
      alert(`Failed to load session: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStep]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        alert("Configuration saved successfully!");
        setShowConfig(false);
      }
    } catch (err) {
      alert("Failed to save config.");
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
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: data.answer,
                      iterations: data.iterations,
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
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Port 7000 · MCP Protocol</div>
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

        {/* Past Sessions Browser - expanded to fill space */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 180,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <History size={13} color="var(--accent)" /> PAST SESSIONS ({savedSessions.length})
            </span>
            <span
              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
              onClick={fetchLogs}
              title="Refresh saved sessions"
            >
              <RefreshCw size={12} />
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", flex: 1 }}>
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
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = "var(--text-muted)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = "var(--border-color)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: "var(--text-main)" }}>
                      <MessageSquare size={11} color="var(--accent)" />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {session.filename.replace(".md", "")}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>
                      {session.preview}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Collapsible Active Model & Tools Container at Bottom */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            marginBottom: 12,
            overflow: "hidden",
            transition: "all 0.2s ease",
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
            <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>CURRENT LLM MODEL</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Cpu size={14} /> {config?.llm.model || "Loading..."}
              </div>

              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>ACTIVE MCP SERVERS</span>
                <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>{config?.tools?.length || 0} Tools</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
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
          <div style={{ fontSize: 13, color: "#8b949e" }}>API Server: http://localhost:7000</div>
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
                <div style={{ maxWidth: "85%", width: "100%" }}>
                  {/* Tool Invocations Section */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {m.toolCalls.map((t) => {
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
                      })}
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
                          }}
                        >
                          <span>Tokens: ~{Math.round(m.content.length / 3.5)}</span>
                          <span>Length: {m.content.length} chars</span>
                          {m.iterations && (
                            <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                              Resolved in {m.iterations} iteration(s)
                            </span>
                          )}
                        </div>
                      </>
                    ) : m.isStreaming ? (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                        Reasoning through tool outputs...
                      </span>
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
                  value={JSON.stringify(config.mcpServers, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setConfig({ ...config, mcpServers: parsed });
                    } catch {}
                  }}
                  style={{
                    flex: 1,
                    minHeight: 330,
                    width: "100%",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    padding: 12,
                    borderRadius: 6,
                    color: "var(--accent-emerald)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    resize: "vertical",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>
                  💡 Plug in any MCP server here (e.g. SQLite, GitHub, Brave Search, Filesystem, or Custom Python/Node scripts).
                </div>
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
    </div>
  );
}

export default App;
