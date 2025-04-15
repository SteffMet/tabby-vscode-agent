import * as z from 'zod';
import { createErrorResponse, createJsonResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { McpLoggerService } from '../../services/mcpLogger.service';
import { CommandOutputStorageService } from '../../services/commandOutputStorage.service';

/**
 * Tool for retrieving stored command outputs with pagination
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
      description: 'Retrieve stored command output with pagination options',
      schema: {
        outputId: z.string().describe('ID of the stored command output to retrieve'),
        startLine: z.number().int().min(1).optional().default(1)
          .describe('Starting line number (1-based, default: 1)'),
        maxLines: z.number().int().optional().default(250)
          .describe('Maximum number of lines to return (default: 250)')
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
