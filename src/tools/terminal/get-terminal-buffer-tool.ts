import * as z from 'zod';
import stripAnsi from 'strip-ansi';
import { createErrorResponse, createJsonResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { ExecToolCategory } from '../terminal';
import { McpLoggerService } from '../../services/mcpLogger.service';

/**
 * Tool for retrieving the current content (text buffer) of a terminal session
 *
 * This tool allows retrieving the text content of a terminal with options
 * to specify line ranges, useful for analyzing command output or terminal state.
 */
export class GetTerminalBufferTool extends BaseTool {
  private readonly MAX_LINES = 200;

  constructor(private execToolCategory: ExecToolCategory, logger: McpLoggerService) {
    super(logger);
  }

  getTool() {
    return {
      name: 'get_terminal_buffer',
      description: `Retrieves the current content (text buffer) of a terminal session with options to specify line ranges.

USE CASES:
- Check the current state of a terminal
- Analyze command output after execution
- Verify if a command completed successfully
- Extract information from the terminal display

LIMITATIONS:
- Maximum of 200 lines can be retrieved at once
- ANSI color codes and formatting are stripped from the output
- Very long lines may be wrapped or truncated by the terminal

RETURNS:
{
  "lines": ["line1", "line2", ...], // Array of text lines from the terminal
  "totalLines": 500, // Total number of lines in the buffer
  "startLine": 1, // The starting line number requested
  "endLine": 200 // The ending line number returned
}

RELATED TOOLS:
- get_ssh_session_list: Find available terminal sessions
- exec_command: Execute commands in a terminal

EXAMPLE USAGE:
1. Get all terminal sessions: get_ssh_session_list()
2. Get the last 50 lines: get_terminal_buffer({ tabId: "0", startLine: 1, endLine: 50 })
3. Get lines 100-200: get_terminal_buffer({ tabId: "0", startLine: 100, endLine: 200 })

POSSIBLE ERRORS:
- "No terminal session found with ID {tabId}" - Use get_ssh_session_list to find valid IDs
- "Failed to get terminal buffer" - The terminal may be in an invalid state`,
      schema: {
        tabId: z.string().describe('The ID of the terminal tab to get the buffer from. Get available IDs by calling get_ssh_session_list first. Example: "0" or "1".'),

        startLine: z.number().int().min(1).optional().default(1)
          .describe('The starting line number from the bottom of the terminal buffer (1-based, default: 1). Line 1 is the most recent line at the bottom of the terminal. Example: 1 for the last line, 10 to start from the 10th line from the bottom.'),

        endLine: z.number().int().optional().default(-1)
          .describe('The ending line number from the bottom of the terminal buffer (1-based, default: -1 for all lines up to the maximum of 200). Must be greater than or equal to startLine. Example: 50 to get 50 lines, -1 to get all available lines up to the maximum.')
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
