import * as z from 'zod';
import stripAnsi from 'strip-ansi';
import { createErrorResponse, createSuccessResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { ExecToolCategory } from '../terminal';
import { McpLoggerService } from '../../services/mcpLogger.service';

/**
 * Tool for executing a command in a terminal
 */
export class ExecCommandTool extends BaseTool {
  constructor(private execToolCategory: ExecToolCategory, logger: McpLoggerService) {
    super(logger);
  }

  getTool() {
    return {
      name: 'exec_command',
      description: 'Execute a command in a terminal session and return the output',
      schema: {
        command: z.string().describe('Command to execute in the terminal'),
        tabId: z.string().optional().describe('Tab ID to execute in, get from get_ssh_session_list')
      },
      handler: async (params, extra) => {
        try {
          const { command, tabId } = params;
          
          // Check if a command is already running
          if (this.execToolCategory.activeCommand) {
            return createErrorResponse('A command is already running. Abort it first.');
          }
          
          // Find all terminal sessions
          const sessions = this.execToolCategory.findAndSerializeTerminalSessions();
          
          // If no tabId is provided, use the active tab
          let session;
          if (tabId) {
            session = sessions.find(s => s.id.toString() === tabId);
            if (!session) {
              return createErrorResponse(`No terminal session found with ID ${tabId}`);
            }
          } else {
            // Find the active tab
            session = sessions.find(s => s.tab.hasFocus);
            if (!session) {
              // If no active tab, use the first one
              session = sessions[0];
              if (!session) {
                return createErrorResponse('No terminal sessions available');
              }
            }
          }
          
          this.logger.info(`Using terminal session ${session.id} (${session.tab.title})`);
          
          // Generate unique markers for this command
          const timestamp = Date.now();
          const startMarker = `TABBY_OUTPUT_START_${timestamp}`;
          const endMarker = `TABBY_OUTPUT_END_${timestamp}`;
          
          // Track exit code
          let exitCode: number | null = null;
          let promptShell: string | null = null;

          // Create abort controller for this command
          let aborted = false;
          const abortHandler = () => {
            aborted = true;
            // Do not send Ctrl+C here, just mark as aborted
          };

          // Set active command
          this.execToolCategory.setActiveCommand({
            tabId: session.id,
            command,
            timestamp,
            startMarker,
            endMarker,
            abort: abortHandler
          });

          // First determine which shell we're running in
          const detectShellScript = this.execToolCategory.shellContext.getShellDetectionScript();
          
          // Send the detection script
          session.tab.sendInput(`\n${detectShellScript}\n`);
          
          // Wait a moment for the shell type to be detected
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Get terminal buffer to check shell type
          const textBeforeSetup = this.execToolCategory.getTerminalBufferText(session);
          
          // Determine shell type from output
          const shellType = this.execToolCategory.shellContext.detectShellType(textBeforeSetup);
          this.logger.info(`Detected shell type: ${shellType}`);
          
          // Get the appropriate shell strategy
          const shellStrategy = this.execToolCategory.shellContext.getStrategy(shellType);
          
          // Get setup script and command prefix
          const setupScript = shellStrategy.getSetupScript(startMarker, endMarker);
          const commandPrefix = shellStrategy.getCommandPrefix();
          
          // Send the appropriate setup script
          session.tab.sendInput(`\n${setupScript}\n`);
          
          // Execute the command with the appropriate prefix
          session.tab.sendInput(`\n${commandPrefix}echo "${startMarker}" && ${command}\n`);
          
          // Wait for command output
          let output = '';
          let commandStarted = false;
          let commandFinished = false;
          
          while (!commandFinished && !aborted) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
            
            // Get terminal buffer
            const textAfter = this.execToolCategory.getTerminalBufferText(session);

            // Clean ANSI codes and process output
            const cleanTextAfter = stripAnsi(textAfter);
            const lines = cleanTextAfter.split('\n');

            let promptIndex = -1;
            // Find start and end markers
            let startIndex = -1;
            let endIndex = -1;

            for (let i = lines.length - 1; i >= 0; i--) {
              if (lines[i].startsWith(startMarker)) {
                startIndex = i;
                commandStarted = true;
                for (let j = startIndex - 1; j >= 0; j--) {
                  if (lines[j].includes(startMarker)) {
                    promptIndex = j;
                    break;
                  }
                }
                for (let j = startIndex + 1; j < lines.length; j++) {
                  if (lines[j].includes(endMarker)) {
                    endIndex = j;
                    commandFinished = true;
                    break;
                  }
                }
                break;
              }
            }

            // Extract output between markers
            if (commandStarted && commandFinished && startIndex !== -1 && endIndex !== -1) {
              const commandOutput = lines.slice(startIndex + 1, endIndex)
                .filter(line => !line.includes(startMarker) && !line.includes(endMarker))
                .join('\n')
                .trim();
              
              if (promptIndex !== -1) {
                promptShell = lines[promptIndex].trim();
              }
              // Extract exit code if available
              for (let i = endIndex; i < Math.min(endIndex + 5, lines.length); i++) {
                if (lines[i].startsWith('exit_code:')) {
                  exitCode = parseInt(lines[i].split(':')[1].trim(), 10);
                  break;
                }
              }
              
              output = commandOutput;
              break;
            }
          }

          // Clear active command
          this.execToolCategory.setActiveCommand(null);

          if (aborted) {
            this.logger.info(`Command was aborted, retrieving partial output`);
            
            const textAfter = this.execToolCategory.getTerminalBufferText(session);
            const cleanTextAfter = stripAnsi(textAfter);
            const lines = cleanTextAfter.split('\n');
            
            // Find start marker
            let startIndex = -1;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(startMarker)) {
                startIndex = i;
                break;
              }
            }
            
            if (startIndex !== -1) {
              // Get everything from start marker to end
              output = lines.slice(startIndex + 1)
                .filter(line => !line.includes(startMarker))
                .join('\n')
                .trim();
            } else {
              // If no start marker found, return whole buffer
              output = cleanTextAfter;
            }
            
            return createSuccessResponse(output, { aborted: true, promptShell, exitCode });
          }

          this.logger.info(`Command executed: ${command}, tabIndex: ${session.id}, output length: ${output.length}`);
          return createSuccessResponse(output, { promptShell, exitCode });
        } catch (err) {
          this.logger.error(`Error executing command:`, err);
          this.execToolCategory.setActiveCommand(null);
          return createErrorResponse(`Failed to execute command: ${err.message || err}`);
        }
      }
    };
  }
}
