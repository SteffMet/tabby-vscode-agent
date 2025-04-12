import { createErrorResponse, createSuccessResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { ExecToolCategory } from '../terminal';
import { McpLoggerService } from '../../services/mcpLogger.service';

/**
 * Tool for aborting the current command
 */
export class AbortCommandTool extends BaseTool {
  constructor(private execToolCategory: ExecToolCategory, logger: McpLoggerService) {
    super(logger);
  }

  getTool() {
    return {
      name: 'abort_command',
      description: 'Abort the currently running command',
      schema: undefined,
      handler: async (_, extra) => {
        if (!this.execToolCategory.activeCommand) {
          return createErrorResponse('No command is currently running');
        }
        
        try {
          this.execToolCategory.abortCurrentCommand();
          return createSuccessResponse('Command aborted successfully');
        } catch (err) {
          this.logger.error(`Error aborting command:`, err);
          return createErrorResponse(`Failed to abort command: ${err.message || err}`);
        }
      }
    };
  }
}
