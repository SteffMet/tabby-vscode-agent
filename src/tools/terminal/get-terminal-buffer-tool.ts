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
  constructor(private execToolCategory: ExecToolCategory, logger: McpLoggerService) {
    super(logger);
  }

  getTool() {
    return {
      name: 'get_terminal_buffer',
      description: 'Get terminal buffer content with options to retrieve specific line ranges from the bottom',
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
          
          // Split into lines
          const lines = stripAnsi(text).split('\n');
          
          // Validate line ranges
          if (startLine < 1) {
            return createErrorResponse(`Invalid startLine: ${startLine}. Must be >= 1`);
          }
          
          if (endLine !== -1 && endLine < startLine) {
            return createErrorResponse(`Invalid endLine: ${endLine}. Must be >= startLine or -1`);
          }
          
          // Calculate line indices from the bottom
          // Note: lines are 1-based from the bottom, so we need to adjust
          const totalLines = lines.length;
          const start = Math.max(0, totalLines - startLine);
          const end = endLine === -1 ? totalLines : Math.min(totalLines, totalLines - (endLine - startLine) - 1);
          
          // Extract the requested lines
          const requestedLines = lines.slice(start, end);
          
          return createJsonResponse({
            lines: requestedLines,
            totalLines,
            startLine,
            endLine: endLine === -1 ? totalLines : endLine
          });
        } catch (err) {
          this.logger.error(`Error getting terminal buffer:`, err);
          return createErrorResponse(`Failed to get terminal buffer: ${err.message || err}`);
        }
      }
    };
  }
}
