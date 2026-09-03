import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPServerDef } from "../config/schema.js";

export interface DiscoveredTool {
  serverName: string;
  name: string;
  description?: string;
  inputSchema: any;
}

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: any;
  };
}

export class MCPClientManager {
  private clients = new Map<string, { client: Client; transport: StdioClientTransport }>();
  private tools = new Map<string, DiscoveredTool>();

  /**
   * Initializes and connects to all configured MCP servers
   */
  async initialize(serversConfig: Record<string, MCPServerDef>): Promise<void> {
    for (const [serverName, def] of Object.entries(serversConfig)) {
      if (!def.enabled) continue;

      try {
        const envRecord: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) {
          if (v !== undefined) envRecord[k] = v;
        }
        if (def.env) {
          for (const [k, v] of Object.entries(def.env)) {
            if (v !== undefined) envRecord[k] = String(v);
          }
        }

        const transport = new StdioClientTransport({
          command: def.command,
          args: def.args,
          env: envRecord,
        });

        const client = new Client(
          {
            name: `loop-client-${serverName}`,
            version: "1.0.0",
          },
          {
            capabilities: {},
          }
        );

        await client.connect(transport);
        this.clients.set(serverName, { client, transport });

        // Query server tools
        const toolsResult = await client.listTools();
        for (const tool of toolsResult.tools) {
          this.tools.set(tool.name, {
            serverName,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          });
        }
      } catch (err: any) {
        console.error(`[MCP] Failed to connect to server "${serverName}":`, err.message);
      }
    }
  }

  /**
   * Returns all discovered tools in OpenAI Function Calling format
   */
  getOpenAITools(): OpenAIToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Calls a tool by name on the corresponding MCP server
   */
  async executeTool(name: string, args: Record<string, any>): Promise<string> {
    const toolDef = this.tools.get(name);
    if (!toolDef) {
      throw new Error(`Tool "${name}" is not registered on any active MCP server.`);
    }

    const target = this.clients.get(toolDef.serverName);
    if (!target) {
      throw new Error(`Server "${toolDef.serverName}" for tool "${name}" is not connected.`);
    }

    const response = await target.client.callTool({
      name,
      arguments: args,
    });

    // Parse content blocks
    if (response.content && Array.isArray(response.content)) {
      return response.content
        .map((item: any) => {
          if (item.type === "text") return item.text;
          return JSON.stringify(item);
        })
        .join("\n");
    }

    return JSON.stringify(response);
  }

  /**
   * Dynamically reloads and switches MCP servers at runtime
   */
  async reloadServers(serversConfig: Record<string, MCPServerDef>): Promise<void> {
    await this.closeAll();
    await this.initialize(serversConfig);
  }

  /**
   * Gracefully close all MCP client connections
   */
  async closeAll(): Promise<void> {
    for (const [serverName, { client, transport }] of this.clients.entries()) {
      try {
        await client.close();
        await transport.close();
      } catch (err) {
        // Ignore closing errors
      }
    }
    this.clients.clear();
    this.tools.clear();
  }
}
