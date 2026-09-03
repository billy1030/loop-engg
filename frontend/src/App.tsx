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
  Search
} from "lucide-react";

interface ToolCallLog {
  id: string;
  toolName: string;
  args: any;
  result?: string;
  timestamp: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  iterations?: number;
  toolCalls?: ToolCallLog[];
  isStreaming?: boolean;
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
  maxLoopIterations: number;
  tools?: any[];
}

export function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your Loop Engineering Chatbot. I can run multi-step reasoning loops and fetch real-time data from the web using MCP tools. What would you like to research or build today?",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial configuration and active MCP tools
  useEffect(() => {
    fetchConfig();
  }, []);

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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
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

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = /^event:\s*(.+)$/m.exec(block);
          const dataMatch = /^data:\s*(.+)$/m.exec(block);

          const event = eventMatch ? eventMatch[1].trim() : "message";
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
                ? { ...t, result: data.result }
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
    <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#0d1117" }}>
      {/* Sidebar Navigation */}
      <div
        style={{
          width: 320,
          background: "#161b22",
          borderRight: "1px solid #30363d",
          display: "flex",
          flexDirection: "column",
          padding: "20px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #1f6feb, #8957e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Cpu size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f6fc" }}>Loop Engg</h2>
            <div style={{ fontSize: 12, color: "#8b949e" }}>Port 7000 · MCP Protocol</div>
          </div>
        </div>

        {/* Status Indicators */}
        <div
          style={{
            background: "#21262d",
            borderRadius: 8,
            padding: 14,
            marginBottom: 20,
            border: "1px solid #30363d",
          }}
        >
          <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 6 }}>ACTIVE MODEL</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#58a6ff", display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={16} /> {config?.llm.model || "Loading..."}
          </div>
          <div style={{ fontSize: 12, color: "#8b949e", marginTop: 10, marginBottom: 6 }}>MCP TOOLS DISCOVERED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {config?.tools?.map((tool: any) => (
              <div
                key={tool.function.name}
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#3fb950",
                  background: "rgba(63, 185, 80, 0.1)",
                  padding: "4px 8px",
                  borderRadius: 4,
                }}
              >
                <Globe size={13} />
                <code>{tool.function.name}</code>
              </div>
            )) || <span style={{ fontSize: 12, color: "#8b949e" }}>Loading tools...</span>}
          </div>
        </div>

        <button
          onClick={() => setShowConfig(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 6,
            background: "#21262d",
            color: "#f0f6fc",
            border: "1px solid #30363d",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            marginTop: "auto",
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
            borderBottom: "1px solid #30363d",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "#161b22",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Activity size={18} color="#3fb950" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Autonomous Tool Loop Inspector</span>
            {currentStep && (
              <span
                style={{
                  background: "#1f6feb",
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
                              background: "#161b22",
                              border: "1px solid #30363d",
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
                                background: "#21262d",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Search size={15} color="#d29922" />
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#d29922" }}>
                                  Tool Call: {t.toolName}
                                </span>
                                <span style={{ fontSize: 11, color: "#8b949e" }}>
                                  args: {JSON.stringify(t.args)}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {t.result ? (
                                  <span style={{ fontSize: 11, color: "#3fb950", display: "flex", alignItems: "center", gap: 4 }}>
                                    <CheckCircle2 size={13} /> Completed
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 11, color: "#58a6ff", display: "flex", alignItems: "center", gap: 4 }}>
                                    <RefreshCw size={12} className="spin" /> Executing...
                                  </span>
                                )}
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div style={{ padding: "12px 14px", background: "#0d1117", borderTop: "1px solid #30363d" }}>
                                <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>PARAMETERS:</div>
                                <pre style={{ fontSize: 12, color: "#58a6ff", marginBottom: 10, overflowX: "auto" }}>
                                  {JSON.stringify(t.args, null, 2)}
                                </pre>
                                <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>OBSERVATION (MCP RESPONSE):</div>
                                <pre
                                  style={{
                                    fontSize: 12,
                                    color: "#f0f6fc",
                                    maxHeight: 200,
                                    overflowY: "auto",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
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
                      background: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "16px 16px 16px 2px",
                      padding: "16px 20px",
                      color: "#f0f6fc",
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.content || (m.isStreaming ? "Reasoning through tool outputs..." : "")}
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
            borderTop: "1px solid #30363d",
            background: "#161b22",
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
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#f0f6fc",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputPrompt.trim()}
            style={{
              padding: "0 20px",
              borderRadius: 8,
              background: loading ? "#21262d" : "#1f6feb",
              color: "#fff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
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
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 580,
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: 12,
              padding: 24,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Configuration & AI Skills</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 6 }}>
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
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  padding: 8,
                  borderRadius: 6,
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 6 }}>
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
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  padding: 8,
                  borderRadius: 6,
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 6 }}>
                System Prompt
              </label>
              <textarea
                rows={3}
                value={config.prompts.systemPrompt}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    prompts: { ...config.prompts, systemPrompt: e.target.value },
                  })
                }
                style={{
                  width: "100%",
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  padding: 8,
                  borderRadius: 6,
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 6 }}>
                AI Skills & Protocols Prompt
              </label>
              <textarea
                rows={4}
                value={config.prompts.skillsPrompt}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    prompts: { ...config.prompts, skillsPrompt: e.target.value },
                  })
                }
                style={{
                  width: "100%",
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  padding: 8,
                  borderRadius: 6,
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  background: "#21262d",
                  border: "1px solid #30363d",
                  color: "#f0f6fc",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  background: "#1f6feb",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
