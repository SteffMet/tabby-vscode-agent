import { Injectable } from '@angular/core';

import { ConfigService } from './config.service';
// import { TabToolCategory } from '../tools/tab';
import { ExecToolCategory } from '../tools/terminal';
import { ToolCategory } from '../type/types';

import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from 'zod';
import { IncomingMessage, ServerResponse } from 'http';

/**
 * The main MCP server service for Tabby
 * Combines both MCP and HTTP server functionality
 */
@Injectable({ providedIn: 'root' })
export class McpService {
  private server: McpServer;
  private transports: { [sessionId: string]: SSEServerTransport } = {};
  private app: express.Application;
  private port: number;
  private isRunning = false;
  private toolCategories: ToolCategory[] = [];

  constructor(
    private config: ConfigService,
    // private tabToolCategory: TabToolCategory,
    private execToolCategory: ExecToolCategory
  ) {
    // Initialize MCP Server
    this.server = new McpServer({
      name: "Tabby",
      version: "1.0.0"
    });

    // Get port from config or use default
    this.port = this.config.store.mcp?.port || 3001;

    // Register tool categories
    // this.registerToolCategory(this.tabToolCategory);
    this.registerToolCategory(this.execToolCategory);
    
    // Configure Express
    this.configureExpress();
  }

  /**
   * Register a tool category with the MCP server
   */
  private registerToolCategory(category: ToolCategory): void {
    this.toolCategories.push(category);
    
    // Register all tools from the category
    category.mcpTools.forEach(tool => {
      // For tools with empty schemas, we keep the schema as-is
      // MCP SDK will handle it appropriately
      this.server.tool(
        tool.name,
        tool.description,
        tool.schema as z.ZodRawShape, 
        tool.handler
      );
      console.log(`Registered tool: ${tool.name} from category: ${category.name}`);
    });
  }

  /**
   * Configure Express server
   */
  private configureExpress(): void {
    this.app = express();
    // this.app.use(cors());
    // DO NOT ENABLE express.json() - MCP server handles JSON parsing 
    // IT WILL CAUSE PROBLEMS : MCP: Failed to reload client: Error POSTing to endpoint (HTTP 400): InternalServerError: stream is not readable
    // this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (_, res) => {
      res.status(200).send('OK');
    });

    this.app.get("/sse", async (req: Request, res: Response) => {
      console.log("Establishing new SSE connection");
      const transport = new SSEServerTransport(
        "/messages",
        res as unknown as ServerResponse<IncomingMessage>,
      );
      console.log(`New SSE connection established for sessionId ${transport.sessionId}`);

      this.transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete this.transports[transport.sessionId];
      });

      await this.server.connect(transport);
    });

    this.app.post("/messages", async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      if (!this.transports[sessionId]) {
        res.status(400).send(`No transport found for sessionId ${sessionId}`);
        return;
      }
      console.log(`Received message for sessionId ${sessionId}`);
      await this.transports[sessionId].handlePostMessage(req, res);
    });
  }

  /**
   * Initialize the MCP service
   */
  public async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('[MCP Service] Already running');
      return;
    }

    try {
      // Start the server
      this.app.listen(this.port, () => {
        console.log(`[MCP Service] MCP server listening on port ${this.port}`);
        this.isRunning = true;
      });
    } catch (err) {
      console.error('[MCP Service] Failed to start MCP server:', err);
      throw err;
    }
  }

  /**
   * Stop the MCP service
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[MCP Service] Not running');
      return;
    }

    try {
      // Close all active transports
      Object.values(this.transports).forEach(transport => {
        transport.close();
      });
      
      this.isRunning = false;
      console.log('[MCP Service] MCP server stopped');
    } catch (err) {
      console.error('[MCP Service] Failed to stop MCP server:', err);
      throw err;
    }
  }
}

// Export types for tools
export * from '../type/types';