import * as z from 'zod';
import { createErrorResponse, createJsonResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { McpLoggerService } from '../../services/mcpLogger.service';
import { CommandOutputStorageService } from '../../services/commandOutputStorage.service';

/**
 * Tool for retrieving the full or paginated output of previously executed commands
 *
 * This tool allows accessing the complete output of commands that may have been
 * truncated in the initial response due to length limitations, with pagination
 * support for very long outputs.
 */
export class GetCommandOutputTool extends BaseTool {
  private readonly MAX_LINES_PER_RESPONSE = 250;
  private outputStorage: CommandOutputStorageService;

  constructor(logger: McpLoggerService, outputStorage?: CommandOutputStorageService) {
    super(logger);
    // If outputStorage is not provided, create a new instance
    this.outputStorage = outputStorage || new CommandOutputStorageService(logger);
  }

  getTool() {
    return {
      name: 'get_command_output',
      description: `Retrieves the full or paginated output of a previously executed command using its outputId.

USE CASES:
- Get the complete output of a command that was truncated
- Retrieve specific portions of a long command output
- Access historical command results

LIMITATIONS:
- The outputId must be from a recent command execution
- Maximum of 250 lines can be retrieved in a single request
- Command output is stored temporarily and may be lost after session restart

RETURNS:
{
  "command": "original command text",
  "output": "paginated command output text",
  "promptShell": "shell prompt (e.g., user@host:~$)",
  "exitCode": 0, // Command exit code
  "aborted": false, // Whether the command was aborted
  "pagination": {
    "startLine": 1, // Starting line of this page
    "endLine": 250, // Ending line of this page
    "totalLines": 1000, // Total lines in the complete output
    "part": 1, // Current page number
    "totalParts": 4, // Total number of pages
    "maxLines": 250 // Maximum lines per page
  }
}

RELATED TOOLS:
- exec_command: Execute commands and get outputId
- get_ssh_session_list: Find available terminal sessions

EXAMPLE USAGE:
1. Execute a command: result = exec_command({ command: "find / -name '*.log'" })
2. If output is truncated, get the outputId from the result
3. Get the first page: get_command_output({ outputId: "abc123", startLine: 1, maxLines: 250 })
4. Get the next page: get_command_output({ outputId: "abc123", startLine: 251, maxLines: 250 })

POSSIBLE ERRORS:
- "Command output with ID {outputId} not found" - The outputId is invalid or expired
- "Failed to retrieve command output" - An error occurred while retrieving the output`,
      schema: {
        outputId: z.string().describe('The unique ID of the stored command output to retrieve. This ID is returned by the exec_command tool when a command has been executed. Example: "cmd_1234567890".'),

        startLine: z.number().int().min(1).optional().default(1)
          .describe('The line number to start retrieving output from (1-based, default: 1). Use this for pagination to retrieve different portions of long outputs. Example: 1 for the first page, 251 for the second page when using default maxLines.'),

        maxLines: z.number().int().optional().default(250)
          .describe('The maximum number of lines to return in a single response (default: 250, maximum: 1000). Adjust this value to control the amount of data returned. Example: 100 for smaller chunks, 500 for larger chunks.')
      },
      handler: async (params: any) => {
        try {
          const { outputId, startLine, maxLines } = params;

          // Get the paginated output
          const paginatedOutput = this.outputStorage.getPaginatedOutput(
            outputId,
            startLine,
            maxLines || this.MAX_LINES_PER_RESPONSE
          );

          if (!paginatedOutput) {
            return createErrorResponse(`Command output with ID ${outputId} not found`);
          }

          // Format the output
          const { lines, totalLines, part, totalParts, command, exitCode, promptShell, aborted } = paginatedOutput;

          // Add pagination info to the output if there are multiple parts
          let outputText = lines.join('\n');
          if (totalParts > 1) {
            outputText += `\n\n[Showing part ${part}/${totalParts} (lines ${startLine}-${Math.min(startLine + lines.length - 1, totalLines)} of ${totalLines})]`;
            outputText += `\nTo see other parts, use startLine parameter (e.g., startLine: ${startLine + maxLines})`;
          }

          return createJsonResponse({
            command,
            output: outputText,
            promptShell,
            exitCode,
            aborted,
            pagination: {
              startLine,
              endLine: Math.min(startLine + lines.length - 1, totalLines),
              totalLines,
              part,
              totalParts,
              maxLines
            }
          });
        } catch (err) {
          this.logger.error(`Error retrieving command output:`, err);
          return createErrorResponse(`Failed to retrieve command output: ${err.message || err}`);
        }
      }
    };
  }
}
