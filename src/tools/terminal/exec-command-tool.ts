import * as z from 'zod';
import stripAnsi from 'strip-ansi';
import { createErrorResponse, createJsonResponse, createSuccessResponse } from '../../type/types';
import { BaseTool } from './base-tool';
import { BaseTerminalTabComponentWithId, ExecToolCategory } from '../terminal';
import { McpLoggerService } from '../../services/mcpLogger.service';
import { CommandOutputStorageService } from '../../services/commandOutputStorage.service';
import { escapeShellString } from '../../utils/escapeShellString';
import { AppService, ConfigService } from 'tabby-core';
import { DialogService } from '../../services/dialog.service';

/**
 * Tool for executing a command in a terminal
 */
export class ExecCommandTool extends BaseTool {
  // Maximum number of lines to return in a single response
  private readonly MAX_LINES_PER_RESPONSE = 250;
  private outputStorage: CommandOutputStorageService;

  constructor(
    private execToolCategory: ExecToolCategory,
    logger: McpLoggerService,
    private config: ConfigService,
    private dialogService: DialogService,
    private app: AppService,
    outputStorage?: CommandOutputStorageService
  ) {
    super(logger);
    // If outputStorage is not provided, create a new instance
    this.outputStorage = outputStorage || new CommandOutputStorageService(logger);
  }

  getTool() {
    return {
      name: 'exec_command',
      description: 'Execute a command in a terminal session and return the output. For long outputs, the command ID is returned which can be used with get_command_output tool to retrieve the full output with pagination.',
      schema: {
        command: z.string().describe('Command to execute in the terminal'),
        commandExplanation: z.string().optional().describe('Explain the command in detail: 1) What the base command does (e.g. "ls" lists directory contents), 2) What each argument/flag does (e.g. "-r" reverses order, "-t" sorts by time, etc), 3) The overall purpose of the complete command'),
        tabId: z.string().optional().describe('Tab ID to execute in, get from get_ssh_session_list')
      },
      handler: async (params, extra) => {
        try {
          console.log('Params:', JSON.stringify(params));
          const { command, tabId, commandExplanation } = params;
          console.log(`Executing command: ${command}, tabId: ${tabId}`);
          if (commandExplanation) {
            console.log(`Command explanation: ${commandExplanation}`);
          }

          // Check if a command is already running
          if (this.execToolCategory.activeCommand) {
            return createErrorResponse('A command is already running. Abort it first.');
          }

          // Check if Pair Programming Mode is enabled
          const pairProgrammingEnabled = this.config.store.mcp?.pairProgrammingMode?.enabled === true;
          const showConfirmationDialog = pairProgrammingEnabled && this.config.store.mcp?.pairProgrammingMode?.showConfirmationDialog !== false;
          const autoFocusTerminal = pairProgrammingEnabled && this.config.store.mcp?.pairProgrammingMode?.autoFocusTerminal !== false;

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

          // Show confirmation dialog if enabled
          if (showConfirmationDialog) {
            try {
              const result = await this.dialogService.showConfirmCommandDialog(
                command,
                session.id,
                session.tab.title,
                commandExplanation
              );

              if (!result || !result.confirmed) {
                // Check if it was rejected with a message
                if (result && result.rejected && result.rejectMessage) {
                  this.logger.info(`Command execution rejected by user: ${result.rejectMessage}`);
                  return createJsonResponse({
                    output: `Command execution rejected: ${result.rejectMessage}`,
                    aborted: true,
                    exitCode: null,
                    userFeedback: {
                      accepted: false,
                      message: result.rejectMessage
                    }
                  });
                } else {
                  // Regular cancellation
                  this.logger.info('Command execution cancelled by user');
                  return createJsonResponse({
                    output: 'Command execution cancelled by user',
                    aborted: true,
                    exitCode: null
                  });
                }
              }
            } catch (error) {
              this.logger.error('Error showing confirmation dialog:', error);
              // Continue with execution if dialog fails
            }
          }

          // Focus terminal if enabled
          if (autoFocusTerminal) {
            try {
              // First, select the tab to make it active
              this.app.selectTab(session.tabParent);

              // Wait for the tab to be selected and focused
              await new Promise(resolve => setTimeout(resolve, 300));

              // Try to focus the tab directly
              if (session.tab && typeof session.tab.focus === 'function') {
                session.tab.focus();
              }

              // Wait a bit more to ensure focus is complete
              await new Promise(resolve => setTimeout(resolve, 200));

              // Check if the tab is focused
              const isFocused = session.tab.hasFocus;
              if (!isFocused) {
                this.logger.warn('Terminal tab may not be properly focused, trying again');

                // Try one more time with a longer delay
                await new Promise(resolve => setTimeout(resolve, 500));

                if (session.tab && typeof session.tab.focus === 'function') {
                  session.tab.focus();
                }

                // Final check
                if (!session.tab.hasFocus) {
                  this.logger.warn('Terminal tab still not focused after retry');
                } else {
                  this.logger.info('Terminal tab focused successfully after retry');
                }
              } else {
                this.logger.info('Terminal tab focused successfully');
              }
            } catch (error) {
              this.logger.error('Error focusing terminal:', error);
              // Continue with execution if focus fails
            }
          }

          // Generate unique markers for this command
          const timestamp = Date.now();
          const startMarker = `_S${timestamp}`;
          const endMarker = `_E${timestamp}`;

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

          // First determine which shell we're running in using read to hide commands
          const detectShellScript = this.execToolCategory.shellContext.getShellDetectionScript();

          session.tab.sendInput('\x03');
          // First send a read command that will hide the detection script - more shell compatible approach
          session.tab.sendInput(`\nstty -echo; read detect_shell; stty echo; eval "$detect_shell"\n`);

          // Send the detection script as input to the read command (will be hidden)
          session.tab.sendInput(`${escapeShellString(detectShellScript)}\n`);

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

          // Send the setup script using read to hide it - more shell compatible approach
          session.tab.sendInput(`stty -echo; read setup_script; stty echo; eval "$setup_script"\n`);
          await new Promise(resolve => setTimeout(resolve, 100));

          // Send the actual setup script (will be hidden by read)
          session.tab.sendInput(`${escapeShellString(setupScript)}\n`);

          // Wait for setup to complete
          await new Promise(resolve => setTimeout(resolve, 100));

          session.tab.sendInput(`${commandPrefix}echo "${startMarker}" && ${command}`);

          await new Promise(resolve => setTimeout(resolve, 500));

          session.tab.sendInput(`\n`);


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
                .filter((line: string) => !line.includes(startMarker) && !line.includes(endMarker))
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
                .filter((line: string) => !line.includes(startMarker))
                .join('\n')
                .trim();
            } else {
              // If no start marker found, return whole buffer
              output = cleanTextAfter;
            }

            // Store the output in the storage service
            const outputId = this.outputStorage.storeOutput({
              command,
              output,
              promptShell,
              exitCode,
              timestamp: Date.now(),
              aborted: true,
              tabId: session.id
            });

            const outputLines = output.split('\n');
            if (outputLines.length > this.MAX_LINES_PER_RESPONSE) {
              output = outputLines.slice(0, this.MAX_LINES_PER_RESPONSE).join('\n') + '\n...';
            }

            // Show result dialog if enabled
            const showResultDialog = pairProgrammingEnabled && this.config.store.mcp?.pairProgrammingMode?.showResultDialog !== false;
            if (showResultDialog) {
              try {
                // Show the result dialog using the dialog service
                const result = await this.dialogService.showCommandResultDialog(
                  command,
                  output,
                  exitCode,
                  true // aborted
                );

                if (result) {
                  if (result.accepted && result.userMessage) {
                    // User accepted with a message
                    return createJsonResponse({
                      output: output,
                      promptShell,
                      exitCode,
                      aborted: true,
                      outputId,
                      message: result.userMessage,
                      userFeedback: {
                        accepted: true,
                        message: result.userMessage
                      }
                    });
                  } else if (result.accepted === false && result.rejectionMessage) {
                    // User rejected with a message
                    return createJsonResponse({
                      output: output,
                      promptShell,
                      exitCode,
                      aborted: true,
                      outputId,
                      message: `Command rejected: ${result.rejectionMessage}`,
                      userFeedback: {
                        accepted: false,
                        message: result.rejectionMessage
                      }
                    });
                  }
                }
              } catch (error) {
                this.logger.error('Error showing result dialog:', error);
                // Continue with normal response if dialog fails
              }
            }

            return createJsonResponse({
              output: output,
              promptShell,
              exitCode,
              aborted: true,
              outputId,
              message: outputLines.length > this.MAX_LINES_PER_RESPONSE
              ? `Output is too long (${outputLines.length} lines). Full output stored with ID: ${outputId}. Use get_command_output tool with this ID to retrieve the full output.`
              : '',
            });
          }

          this.logger.info(`Command executed: ${command}, tabIndex: ${session.id}, output length: ${output.length}`);

          // Store the output in the storage service
          const outputId = this.outputStorage.storeOutput({
            command,
            output,
            promptShell,
            exitCode,
            timestamp: Date.now(),
            aborted: false,
            tabId: session.id
          });

          const outputLines = output.split('\n');
          if (outputLines.length > this.MAX_LINES_PER_RESPONSE) {
            output = outputLines.slice(0, this.MAX_LINES_PER_RESPONSE).join('\n') + '\n...';
          }

          // Show result dialog if enabled
          const showResultDialog = pairProgrammingEnabled && this.config.store.mcp?.pairProgrammingMode?.showResultDialog !== false;
          if (showResultDialog) {
            try {
              // Show the result dialog using the dialog service
              const result = await this.dialogService.showCommandResultDialog(
                command,
                output,
                exitCode,
                false // not aborted
              );

              if (result) {
                if (result.accepted && result.userMessage) {
                  // User accepted with a message
                  return createJsonResponse({
                    output: output,
                    promptShell,
                    exitCode,
                    aborted: false,
                    outputId,
                    message: result.userMessage,
                    userFeedback: {
                      accepted: true,
                      message: result.userMessage
                    }
                  });
                } else if (result.accepted === false && result.rejectionMessage) {
                  // User rejected with a message
                  return createJsonResponse({
                    output: output,
                    promptShell,
                    exitCode,
                    aborted: false,
                    outputId,
                    message: `Command rejected: ${result.rejectionMessage}`,
                    userFeedback: {
                      accepted: false,
                      message: result.rejectionMessage
                    }
                  });
                }
              }
            } catch (error) {
              this.logger.error('Error showing result dialog:', error);
              // Continue with normal response if dialog fails
            }
          }

          return createJsonResponse({
            output: output,
            promptShell,
            exitCode,
            aborted: false,
            outputId,
            message: outputLines.length > this.MAX_LINES_PER_RESPONSE
            ? `Output is too long (${outputLines.length} lines). Full output stored with ID: ${outputId}. Use get_command_output tool with this ID to retrieve the full output.`
            : '',
          });
        } catch (err) {
          this.logger.error(`Error executing command:`, err);
          this.execToolCategory.setActiveCommand(null);
          return createErrorResponse(`Failed to execute command: ${err.message || err}`);
        }
      }
    };
  }
}
