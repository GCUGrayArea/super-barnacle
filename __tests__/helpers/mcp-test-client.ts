/**
 * MCP Test Client Helper
 *
 * Provides a test client for communicating with the MCP server
 * via the actual MCP protocol (not direct function calls).
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Test Client
 *
 * Wraps the MCP SDK client for use in E2E tests
 */
export class MCPTestClient {
  private client: Client;
  private transport?: SSEClientTransport;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.client = new Client(
      {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    // Create SSE client transport
    this.transport = new SSEClientTransport(
      new URL(`${this.baseUrl}/sse`),
      new URL(`${this.baseUrl}/message`)
    );

    // Connect to the server
    await this.client.connect(this.transport);
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = undefined;
    }
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<Tool[]> {
    const response = await this.client.request(
      {
        method: 'tools/list',
      },
      ListToolsResultSchema
    );
    return response.tools;
  }

  /**
   * Call a tool
   */
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const response = await this.client.request(
      {
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      },
      CallToolResultSchema
    );

    return response;
  }

  /**
   * Get a specific tool definition by name
   */
  async getTool(name: string): Promise<Tool | undefined> {
    const tools = await this.listTools();
    return tools.find((tool) => tool.name === name);
  }

  /**
   * Helper to extract text from tool response
   */
  extractText(response: { content: Array<{ type: string; text: string }> }): string {
    return response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.transport !== undefined;
  }
}

/**
 * Create a test MCP client
 */
export function createTestClient(baseUrl?: string): MCPTestClient {
  return new MCPTestClient(baseUrl);
}
