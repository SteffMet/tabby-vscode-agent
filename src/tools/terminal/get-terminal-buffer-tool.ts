import * as z from 'zod';
import stripAnsi from 'strip-ansi';
import { createErrorResponse, createJsonResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { ExecToolCategory } from '../terminal';
import { McpLoggerService } from '../../services/mcpLogger.service';

/**
 * Tool for getting terminal buffer content with line range options
 */
export class GetTerminalBufferTool extends BaseTool {
  private readonly MAX_LINES = 200;

  constructor(private execToolCategory: ExecToolCategory, logger: McpLoggerService) {
    super(logger);
  }

  getTool() {
    return {
      name: 'get_terminal_buffer',
      description: 'Get terminal buffer content with options to retrieve specific line ranges from the bottom. Max lines: 200',
      schema: {
        tabId: z.string().describe('Tab ID to get buffer from, get from get_ssh_session_list'),
        startLine: z.number().int().min(1).optional().default(1)
          .describe('Starting line number from the bottom (1-based, default: 1)'),
        endLine: z.number().int().optional().default(-1)
          .describe('Ending line number from the bottom (1-based, default: -1 for all lines)')
      },
      handler: async (params, extra) => {
        try {
          const { tabId, startLine, endLine } = params;
          
          // Find all terminal sessions
          const sessions = this.execToolCategory.findAndSerializeTerminalSessions();
          
          // Find the requested session
          const session = sessions.find(s => s.id.toString() === tabId);
          if (!session) {
            return createErrorResponse(`No terminal session found with ID ${tabId}`);
          }
          
          // Get terminal buffer
          const text = this.execToolCategory.getTerminalBufferText(session);
          if (!text) {
            return createErrorResponse('Failed to get terminal buffer text');
          }
          
          // Split into lines and remove empty lines
          const lines = stripAnsi(text).split('\n').filter(line => line.trim().length > 0);
          
          // Validate line ranges
          if (startLine < 1) {
            return createErrorResponse(`Invalid startLine: ${startLine}. Must be >= 1`);
          }
          
          if (endLine !== -1 && endLine < startLine) {
            return createErrorResponse(`Invalid endLine: ${endLine}. Must be >= startLine or -1`);
          }

          const totalLines = lines.length;
          
          // Calculate line indices from the bottom
          const start = Math.max(0, totalLines - startLine);
          const end = endLine === -1 
            ? Math.max(start - this.MAX_LINES, 0) 
            : Math.max(0, start - endLine);
          
          // Extract the requested lines
          const requestedLines = lines.slice(end, start);
          
          return createJsonResponse({
            lines: requestedLines,
            totalLines,
            startLine,
            endLine: endLine === -1 ? Math.min(startLine + this.MAX_LINES - 1, totalLines) : endLine
          });
        } catch (err) {
          this.logger.error(`Error getting terminal buffer:`, err);
          return createErrorResponse(`Failed to get terminal buffer: ${err.message || err}`);
        }
      }
    };
  }
}
