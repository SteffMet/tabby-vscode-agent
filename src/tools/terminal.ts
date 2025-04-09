import { Injectable } from '@angular/core';
import { AppService, SplitTabComponent } from 'tabby-core';
import { BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal';
import { BaseToolCategory } from './base-tool-category';
import { McpTool, createErrorResponse, createJsonResponse, createSuccessResponse } from '../type/types';
import * as z from 'zod';
import stripAnsi from 'strip-ansi';
import { SerializeAddon } from '@xterm/addon-serialize';
import { BehaviorSubject } from 'rxjs';

/**
 * Interface for terminal tab component with ID
 */
interface BaseTerminalTabComponentWithId {
  id: number;
  tab: BaseTerminalTabComponent<any>;
}

/**
 * Interface for tracking active command
 */
interface ActiveCommand {
  tabId: number;
  command: string;
  timestamp: number;
  startMarker: string;
  endMarker: string;
  abort: () => void;
}

/**
 * Terminal execution tool category
 * Provides tools for terminal commands execution and SSH session management
 */
@Injectable({ providedIn: 'root' })
export class ExecToolCategory extends BaseToolCategory {
  name: string = 'exec';
  
  // Track active command execution
  private _activeCommand: ActiveCommand | null = null;
  private _activeCommandSubject = new BehaviorSubject<ActiveCommand | null>(null);
  
  // Observable for UI to subscribe to
  public readonly activeCommand$ = this._activeCommandSubject.asObservable();

  constructor(private app: AppService) {
    super();
    
    // Log discovered terminal sessions for debugging
    this.findAndSerializeTerminalSessions().forEach(session => {
      console.log(`[DEBUG] Found session: ${session.id}, ${session.tab.title}`);
    });
    
    // Register all terminal tools
    this.registerTool(this.getSshSessionList());
    this.registerTool(this.execCommand());
    this.registerTool(this.getTerminalBuffer());
    this.registerTool(this.abortCommand());
  }

  /**
   * Get current active command
   */
  public get activeCommand(): ActiveCommand | null {
    return this._activeCommand;
  }

  /**
   * Set active command and notify subscribers
   */
  private setActiveCommand(command: ActiveCommand | null): void {
    this._activeCommand = command;
    this._activeCommandSubject.next(command);
    console.log(`[DEBUG] Active command updated: ${command ? command.command : 'none'}`);
  }

  /**
   * Abort the current command if any
   */
  public abortCurrentCommand(): void {
    if (this._activeCommand) {
      this._activeCommand.abort();
      this._activeCommand = null;
      this._activeCommandSubject.next(null);
      console.log(`[DEBUG] Command aborted by user`);
    }
  }

  /**
   * Find all terminal sessions and map them to a serializable format
   * @returns Array of terminal sessions with IDs
   */
  private findAndSerializeTerminalSessions(): BaseTerminalTabComponentWithId[] {
    const sessions: BaseTerminalTabComponentWithId[] = [];
    let id = 0;
    this.app.tabs.forEach(tab => {
      if (tab instanceof BaseTerminalTabComponent) {
        sessions.push({
          id: id++,
          tab: tab as BaseTerminalTabComponent<any>
        });
      } else if (tab instanceof SplitTabComponent) {
        sessions.push(...tab.getAllTabs()
          .filter(childTab => childTab instanceof BaseTerminalTabComponent && (childTab as BaseTerminalTabComponent<any>).frontend !== undefined)
          .map(childTab => ({
            id: id++,
            tab: childTab as BaseTerminalTabComponent<any>
          })));
      }
    });
    return sessions;
  }

  /**
   * Get a list of SSH sessions
   */
  private getSshSessionList(): McpTool<any> {
    return {
      name: 'get_ssh_session_list',
      description: 'Get a list of all SSH sessions',
      schema: undefined,
      handler: async (_, extra) => {
        const serializedSessions = this.findAndSerializeTerminalSessions().map(session => ({
          id: session.id,
          title: session.tab.title,
          customTitle: session.tab.customTitle,
          hasActivity: session.tab.hasActivity,
          hasFocus: session.tab.hasFocus,
        }));
        
        return createJsonResponse(serializedSessions);
      }
    };
  }

  /**
   * Abort the current command
   */
  private abortCommand(): McpTool<any> {
    return {
      name: 'abort_command',
      description: 'Abort the currently running command',
      schema: undefined,
      handler: async (_, extra) => {
        if (!this._activeCommand) {
          return createErrorResponse('No command is currently running');
        }
        
        try {
          this.abortCurrentCommand();
          return createSuccessResponse('Command aborted successfully');
        } catch (err) {
          console.error(`[DEBUG] Error aborting command:`, err);
          return createErrorResponse(`Failed to abort command: ${err.message || err}`);
        }
      }
    };
  }

  /**
   * Execute a command in a terminal
   * Schema:
   * - command: string (required) - The command to execute
   * - tabId: string (optional) - The ID of the tab to execute in, defaults to active tab
   */
  private execCommand(): McpTool<any> {
    return {
      name: 'exec_command',
      description: 'Execute a command in a terminal session and return the output',
      schema: {
        command: z.string().describe('Command to execute in the terminal'),
        tabId: z.string().optional().describe('Tab ID to execute in, get from get_ssh_session_list')
      },
      handler: async (params, extra) => {
        const {
          command,
          tabId
        } = params;

        const sessions = this.findAndSerializeTerminalSessions();
        const session = sessions.find(s => s.id === parseInt(tabId, 10));
        
        if (!session) {
          return createErrorResponse('Invalid tab ID');
        }

        console.log(`[DEBUG] Execute command: ${command}, tabIndex: ${session.id}`);

        // Check if another command is already running
        if (this._activeCommand) {
          return createErrorResponse('Another command is already running. Abort it first.');
        }

        try {
          // Setup shell hooks
          const timestamp = Date.now();
          const startMarker = `TABBY_OUTPUT_START_${timestamp}`;
          const endMarker = `TABBY_OUTPUT_END_${timestamp}`;
          let exitCode: number | null = null;

          // Create abort controller for this command
          let aborted = false;
          const abortHandler = () => {
            aborted = true;
          };

          // Set active command
          this.setActiveCommand({
            tabId: session.id,
            command,
            timestamp,
            startMarker,
            endMarker,
            abort: abortHandler
          });

          // Setup: Encode scripts as base64 to avoid issues with shell special characters
          const setupScriptContent = `
function __tabby_post_command() {
  local exit_code=$?
  if [[ $(history | tail -n 1 | awk '{$1=""; sub(/^ /, ""); print}') == 'echo "${startMarker}"'* ]]; then
    echo "${endMarker}"
    echo "exit_code: $exit_code"
  fi
}
trap - DEBUG 2>/dev/null
[ -n "$PROMPT_COMMAND" ] && PROMPT_COMMAND=$(echo "$PROMPT_COMMAND" | sed 's/__tabby_post_command;//g') 2>/dev/null
[ -n "$preexec_functions" ] && preexec_functions=() 2>/dev/null
[ -n "$precmd_functions" ] && precmd_functions=() 2>/dev/null
if [ -n "$BASH_VERSION" ]; then
  PROMPT_COMMAND="__tabby_post_command;$PROMPT_COMMAND"
elif [ -n "$ZSH_VERSION" ]; then
  precmd_functions=(__tabby_post_command)
else
  OLD_PS1="$PS1"
  PS1='$(__tabby_post_command)'$PS1
fi
`;
          
          // Cleanup script
          const cleanupScriptContent = `
trap - DEBUG 2>/dev/null
[ -n "$PROMPT_COMMAND" ] && PROMPT_COMMAND=$(echo "$PROMPT_COMMAND" | sed 's/__tabby_post_command;//g') 2>/dev/null
if [ -n "$OLD_PS1" ]; then
  PS1="$OLD_PS1"
  unset OLD_PS1
fi
unset __tabby_post_command
`;

          // Execute setup (in silent mode)
          session.tab.sendInput(setupScriptContent);
          // session.tab.sendInput(cleanupScriptContent);
          
          session.tab.sendInput(`echo "${startMarker}" && ${command}\n`);
          
          // Wait for command output
          let output = '';
          let commandStarted = false;
          let commandFinished = false;
          
          while (!commandFinished && !aborted) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
            
            // Get terminal buffer
            let textAfter = "";
            if (session.tab.frontend instanceof XTermFrontend) {
              if (!session.tab.frontend.xterm['_serializeAddon']) {
                const addon = new SerializeAddon();
                session.tab.frontend.xterm.loadAddon(addon);
                session.tab.frontend.xterm['_serializeAddon'] = addon;
              }
              textAfter = session.tab.frontend.xterm['_serializeAddon'].serialize();
            }

            // Clean ANSI codes and process output
            const cleanTextAfter = stripAnsi(textAfter);
            const lines = cleanTextAfter.split('\n');

            // Find start and end markers
            let startIndex = -1;
            let endIndex = -1;

            for (let i = lines.length - 1; i >= 0; i--) {
              console.log(`[DEBUG] lines[i]: ${lines[i]}`);
              if (lines[i].startsWith(startMarker)) {
                startIndex = i;
                commandStarted = true;
                for (let j = startIndex + 1; j < lines.length; j++) {
                  if (lines[j].startsWith(endMarker)) {
                    endIndex = j;
                    commandFinished = true;
                    break;
                  }
                }
                break;
              }
            }

            console.log(`[DEBUG] startIndex: ${startIndex}, endIndex: ${endIndex}`);

            // Extract output between markers
            if (commandStarted && commandFinished && startIndex !== -1 && endIndex !== -1) {
              const commandOutput = lines.slice(startIndex + 1, endIndex)
                .filter(line => !line.includes(startMarker) && !line.includes(endMarker))
                .join('\n')
                .trim();
              output = commandOutput;
              try {
                exitCode = parseInt(lines[endIndex+1].split(':')[1].trim());
              } catch (err) {
                console.error(`[DEBUG] Error parsing exit code:`, err);
              }
              break;
            }

            // Timeout after 30 seconds
            if (Date.now() - timestamp > 30000) {
              throw new Error('Command execution timed out after 30 seconds');
            }
          }

          // Cleanup hooks

          session.tab.sendInput(cleanupScriptContent);

          // Clear active command
          this.setActiveCommand(null);

          // If aborted, get buffer from marker to end
          if (aborted) {
            console.log(`[DEBUG] Command was aborted, retrieving partial output`);
            
            let textAfter = "";
            if (session.tab.frontend instanceof XTermFrontend) {
              if (!session.tab.frontend.xterm['_serializeAddon']) {
                const addon = new SerializeAddon();
                session.tab.frontend.xterm.loadAddon(addon);
                session.tab.frontend.xterm['_serializeAddon'] = addon;
              }
              textAfter = session.tab.frontend.xterm['_serializeAddon'].serialize();
            }

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
            
            return createSuccessResponse(output, { aborted: true, exitCode });
          }

          console.log(`[DEBUG] Command executed: ${command}, tabIndex: ${session.id}, output length: ${output.length}`);
          return createSuccessResponse(output, );
        } catch (err) {
          console.error(`[DEBUG] Error capturing command output:`, err);
          // Clear active command on error
          this.setActiveCommand(null);
          return createErrorResponse(`Failed to capture command output in session ${session.id} (${session.tab.title}): ${err.message || err}`);
        }
      }
    };
  }

  /**
   * Get terminal buffer content with line range options
   * Schema:
   * - tabId: string (required) - The ID of the tab to get buffer from
   * - startLine: number (optional) - The starting line number from the bottom (1-based, default: 1)
   * - endLine: number (optional) - The ending line number from the bottom (1-based, default: -1 for all lines)
   */
  private getTerminalBuffer(): McpTool<any> {
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
        const {
          tabId,
          startLine = 1,
          endLine = -1
        } = params;

        const sessions = this.findAndSerializeTerminalSessions();
        const session = sessions.find(s => s.id === parseInt(tabId, 10));
        
        if (!session) {
          return createErrorResponse('Invalid tab ID');
        }

        try {
          // Get terminal buffer content
          let bufferText = "";
          if (session.tab.frontend instanceof XTermFrontend) {
            if (!session.tab.frontend.xterm['_serializeAddon']) {
              const addon = new SerializeAddon();
              session.tab.frontend.xterm.loadAddon(addon);
              session.tab.frontend.xterm['_serializeAddon'] = addon;
              console.log('✅ SerializeAddon loaded');
            }
            bufferText = session.tab.frontend.xterm['_serializeAddon'].serialize() || '';
            console.log(`[DEBUG] Buffer text retrieved (length: ${bufferText.length})`);
          } else {
            return createErrorResponse('Terminal frontend does not support buffer access');
          }

          // Clean ANSI codes for readability
          const cleanBuffer = stripAnsi(bufferText);
          const lines = cleanBuffer.split('\n');
          
          // Validate line ranges
          const totalLines = lines.length;
          
          // Handle special case: endLine = -1 means all lines to the top
          const effectiveEndLine = endLine === -1 ? totalLines : endLine;
          
          // Validate start and end lines
          if (startLine > totalLines) {
            return createErrorResponse(`startLine (${startLine}) exceeds total lines in buffer (${totalLines})`);
          }
          
          if (effectiveEndLine > totalLines) {
            return createErrorResponse(`endLine (${effectiveEndLine}) exceeds total lines in buffer (${totalLines})`);
          }
          
          if (startLine > effectiveEndLine && effectiveEndLine !== -1) {
            return createErrorResponse(`startLine (${startLine}) cannot be greater than endLine (${effectiveEndLine})`);
          }
          
          // Calculate actual array indices (convert from 1-based to 0-based and from bottom to top)
          const startIndex = totalLines - effectiveEndLine;
          const endIndex = totalLines - startLine + 1;
          
          // Extract the requested lines
          const selectedLines = lines.slice(startIndex, endIndex);
          const output = selectedLines.join('\n');
          
          console.log(`[DEBUG] Terminal buffer extracted: ${startLine}-${effectiveEndLine === totalLines ? 'all' : effectiveEndLine} (${selectedLines.length} lines)`);
          
          return createSuccessResponse(output);
        } catch (err) {
          console.error(`[DEBUG] Error retrieving terminal buffer:`, err);
          return createErrorResponse(`Failed to retrieve terminal buffer: ${err.message || err}`);
        }
      }
    };
  }
}