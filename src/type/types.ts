import { z } from 'zod';

/**
 * Standard MCP response content types
 * Must match the MCP SDK expected format
 */
export type McpTextContent = { 
  [x: string]: unknown;
  type: "text"; 
  text: string;
};

export type McpImageContent = { 
  [x: string]: unknown;
  type: "image"; 
  data: string; 
  mimeType: string;
};

export type McpResourceContent = { 
  [x: string]: unknown;
  type: "resource"; 
  resource: { 
    [x: string]: unknown;
    text: string; 
    uri: string; 
    mimeType?: string; 
  } | { 
    [x: string]: unknown;
    uri: string; 
    blob: string; 
    mimeType?: string; 
  };
};

export type McpContent = McpTextContent | McpImageContent | McpResourceContent;

/**
 * Standard MCP response format
 * Must match the MCP SDK expected format
 */
export interface McpResponse {
  [x: string]: unknown;
  content: McpContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

/**
 * Success response helper
 */
export function createSuccessResponse(text: string, metadata?: Record<string, any>): McpResponse {
  return {
    content: [{
      type: "text",
      text
    }],
    _meta: metadata
  };
}

/**
 * JSON response helper
 */
export function createJsonResponse(data: any): McpResponse {
  return {
    content: [{
      type: "text",
      text: JSON.stringify(data, null, 2)
    }]
  };
}

/**
 * Error response helper
 */
export function createErrorResponse(errorMessage: string): McpResponse {
  return {
    content: [{
      type: "text",
      text: errorMessage
    }],
    isError: true
  };
}

/**
 * A generic MCP tool definition
 */
export interface McpTool<T> {
  /**
   * The name of the tool
   */
  name: string;

  /**
   * The description of the tool
   */
  description: string;

  /**
   * The Zod schema for validating tool arguments
   * This should be a record of Zod validators
   * For tools with no parameters, use {} (empty object)
   */
  schema: Record<string, z.ZodType<any>> | undefined;
  
  /**
   * The handler function for the tool
   */
  handler: (args: T, extra: any) => Promise<McpResponse>;
}

/**
 * Base interface for tool categories
 */
export interface ToolCategory {
  /**
   * The name of the category
   */
  name: string;

  /**
   * List of MCP tools in this category
   */
  readonly mcpTools: McpTool<any>[];
}