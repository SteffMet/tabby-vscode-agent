import { Injectable } from '@angular/core';
import { AppService, SplitTabComponent } from 'tabby-core';
import { BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal';
import { BaseToolCategory } from './base-tool-category';
import { McpTool, createErrorResponse, createJsonResponse, createSuccessResponse } from '../type/types';
import * as z from 'zod';
import stripAnsi from 'strip-ansi';
import { SerializeAddon } from '@xterm/addon-serialize';
import { BehaviorSubject } from 'rxjs';
import { ShellContext } from './shell-strategy';

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

  // Shell context for managing different shell types
  private shellContext = new ShellContext();

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
      // Call the abort handler which just sets the aborted flag
      this._activeCommand.abort();
      this._activeCommand = null;
      this._activeCommandSubject.next(null);
      console.log(`[DEBUG] Command aborted by user`);
    }
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
   * Get terminal buffer content as text
   * @param session The terminal session
   * @returns The terminal buffer content as text
   */
  private getTerminalBufferText(session: BaseTerminalTabComponentWithId): string {
    try {
      const frontend = session.tab.frontend as XTermFrontend;
      if (!frontend || !frontend.xterm) {
        console.error(`[DEBUG] No xterm frontend available for session ${session.id}`);
        return '';
      }
      
      // Check if serialize addon is already registered
      let serializeAddon = (frontend.xterm as any)._addonManager._addons.find(
        addon => addon.instance instanceof SerializeAddon
      )?.instance;
      
      // If not, register it
      if (!serializeAddon) {
        serializeAddon = new SerializeAddon();
        frontend.xterm.loadAddon(serializeAddon);
      }
      
      // Get the terminal content
      return serializeAddon.serialize();
    } catch (err) {
      console.error(`[DEBUG] Error getting terminal buffer:`, err);
      return '';
    }
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
        try {
          const { command, tabId } = params;
          
          // Check if a command is already running
          if (this._activeCommand) {
            return createErrorResponse('A command is already running. Abort it first.');
          }
          
          // Find all terminal sessions
          const sessions = this.findAndSerializeTerminalSessions();
          
          // If no tabId is provided, use the active tab
          let session: BaseTerminalTabComponentWithId | undefined;
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
          
          console.log(`[DEBUG] Using terminal session ${session.id} (${session.tab.title})`);
          
          // Generate unique markers for this command
          const timestamp = Date.now();
          const startMarker = `TABBY_OUTPUT_START_${timestamp}`;
          const endMarker = `TABBY_OUTPUT_END_${timestamp}`;
          
          // Track exit code
          let exitCode: number | null = null;

          // Create abort controller for this command
          let aborted = false;
          const abortHandler = () => {
            aborted = true;
            // Do not send Ctrl+C here, just mark as aborted
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

          // First determine which shell we're running in
          const detectShellScript = this.shellContext.getShellDetectionScript();
          
          // Send the detection script
          session.tab.sendInput(`\n${detectShellScript}\n`);
          
          // Wait a moment for the shell type to be detected
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Get terminal buffer to check shell type
          const textBeforeSetup = this.getTerminalBufferText(session);
          
          // Determine shell type from output
          const shellType = this.shellContext.detectShellType(textBeforeSetup);
          console.log(`[DEBUG] Detected shell type: ${shellType}`);
          
          // Get the appropriate shell strategy
          const shellStrategy = this.shellContext.getStrategy(shellType);
          
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
            const textAfter = this.getTerminalBufferText(session);

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
                  if (lines[j].includes(endMarker)) {
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
          this.setActiveCommand(null);

          if (aborted) {
            console.log(`[DEBUG] Command was aborted, retrieving partial output`);
            
            const textAfter = this.getTerminalBufferText(session);
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
          return createSuccessResponse(output, { exitCode });
        } catch (err) {
          console.error(`[DEBUG] Error executing command:`, err);
          this.setActiveCommand(null);
          return createErrorResponse(`Failed to execute command: ${err.message || err}`);
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
        try {
          const { tabId, startLine, endLine } = params;
          
          // Find all terminal sessions
          const sessions = this.findAndSerializeTerminalSessions();
          
          // Find the requested session
          const session = sessions.find(s => s.id.toString() === tabId);
          if (!session) {
            return createErrorResponse(`No terminal session found with ID ${tabId}`);
          }
          
          // Get terminal buffer
          const text = this.getTerminalBufferText(session);
          
          // Split into lines
          const lines = stripAnsi(text).split('\n');
          
          // Validate line ranges
          if (startLine < 1) {
            return createErrorResponse(`Invalid startLine: ${startLine}. Must be >= 1`);
          }
          
          if (endLine !== -1 && endLine < startLine) {
            return createErrorResponse(`Invalid endLine: ${endLine}. Must be >= startLine or -1`);
          }
          
          // Calculate line indices from the bottom
          // Note: lines are 1-based from the bottom, so we need to adjust
          const totalLines = lines.length;
          const start = Math.max(0, totalLines - startLine);
          const end = endLine === -1 ? totalLines : Math.min(totalLines, totalLines - (endLine - startLine) - 1);
          
          // Extract the requested lines
          const requestedLines = lines.slice(start, end);
          
          return createJsonResponse({
            lines: requestedLines,
            totalLines,
            startLine,
            endLine: endLine === -1 ? totalLines : endLine
          });
        } catch (err) {
          console.error(`[DEBUG] Error getting terminal buffer:`, err);
          return createErrorResponse(`Failed to get terminal buffer: ${err.message || err}`);
        }
      }
    };
  }
}