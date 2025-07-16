import { AppService } from 'tabby-core';
import { createSuccessResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { McpLoggerService } from '../../services/mcpLogger.service';

/**
 * Tool for opening the VSCode Copilot chat window.
 */
export class OpenCopilotTool extends BaseTool {
  constructor(
    private app: AppService,
    logger: McpLoggerService,
  ) {
    super(logger);
  }

  getTool() {
    return {
      name: 'open_copilot',
      description: 'Opens the VSCode Copilot chat window.',
      schema: {},
      handler: async () => {
        try {
          this.logger.info('Emitting command to open Copilot window');
          this.app.emit('mcp-run-command', {
            command: 'workbench.action.chat.openInNewWindow',
          });
          return createSuccessResponse('Command sent to open Copilot window.');
        } catch (error) {
          this.logger.error('Failed to emit open Copilot command:', error);
          throw error;
        }
      },
    };
  }
}