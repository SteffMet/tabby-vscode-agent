import { createErrorResponse, createSuccessResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { ExecToolCategory } from '../terminal';
import { McpLoggerService } from '../../services/mcpLogger.service';

/**
 * Tool for aborting a currently running command
 *
 * This tool allows stopping a command that was started with exec_command
 * and is still running, freeing up the terminal for new commands.
 */
export class AbortCommandTool extends BaseTool {
  constructor(private execToolCategory: ExecToolCategory, logger: McpLoggerService) {
    super(logger);
  }

  getTool() {
    return {
      name: 'abort_command',
      description: `Aborts the currently running command that was started with exec_command.

USE CASES:
- Stop a long-running command
- Cancel a command that is stuck or unresponsive
- Free up the terminal for a new command

RETURNS:
On success:
{
  "content": [{ "type": "text", "text": "Command aborted successfully" }]
}

On failure:
{
  "content": [{ "type": "text", "text": "Error message" }],
  "isError": true
}

RELATED TOOLS:
- exec_command: Execute commands in a terminal
- get_ssh_session_list: Find available terminal sessions

EXAMPLE USAGE:
1. Start a command: exec_command({ command: "sleep 60" })
2. Abort the command: abort_command()

POSSIBLE ERRORS:
- "No command is currently running" - There is no active command to abort
- "Failed to abort command" - The command could not be aborted due to an error`,
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
