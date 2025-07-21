import { exec } from 'child_process';
import * as net from 'net';
import { createSuccessResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { McpLoggerService } from '../../services/mcpLogger.service';
import { AppService } from 'tabby-core';

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

  private openCopilotWithTcp(): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.connect(6789, '127.0.0.1', () => {
        this.logger.info('Connected to tabby-copilot-opener. Opening Copilot window.');
        client.end();
        resolve(true);
      });

      client.on('error', (err) => {
        this.logger.info('Could not connect to tabby-copilot-opener. Falling back to shell command.');
        resolve(false);
      });
    });
  }

  private openCopilotWithShell(): void {
    this.logger.info('Opening Copilot window via shell command');
    exec('code --command workbench.action.chat.openInNewWindow', (error, stdout, stderr) => {
      if (error) {
        this.logger.error('Error running VS Code Copilot command:', error);
      } else {
        this.logger.info(`VS Code Copilot command executed: ${stdout}`);
      }
    });
    this.app.emit('mcp-show-notification', {
      message: 'Recommend using tabby-copilot-opener extension in vscode for a seamless integration.',
    });
  }

  getTool() {
    return {
      name: 'open_copilot',
      description: 'Opens the VSCode Copilot chat window.',
      schema: {},
      handler: async () => {
        try {
          this.logger.info('Attempting to open Copilot window');
          const openedWithTcp = await this.openCopilotWithTcp();
          if (!openedWithTcp) {
            this.openCopilotWithShell();
            return createSuccessResponse('Command sent to open Copilot window using shell command.');
          }
          return createSuccessResponse('Command sent to open Copilot window via TCP.');
        } catch (error) {
          this.logger.error('Failed to open Copilot window:', error);
          throw error;
        }
      },
    };
  }
}