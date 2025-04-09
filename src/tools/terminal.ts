import { Injectable } from '@angular/core';
import { AppService, SplitTabComponent } from 'tabby-core';
import { BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal';
import { BaseToolCategory } from './base-tool-category';
import { McpTool, createErrorResponse, createJsonResponse, createSuccessResponse } from '../type/types';
import * as z from 'zod';
import stripAnsi from 'strip-ansi';
import { SerializeAddon } from '@xterm/addon-serialize';

/**
 * Interface for terminal tab component with ID
 */
interface BaseTerminalTabComponentWithId {
  id: number;
  tab: BaseTerminalTabComponent<any>;
}

/**
 * Terminal execution tool category
 * Provides tools for terminal commands execution and SSH session management
 */
@Injectable({ providedIn: 'root' })
export class ExecToolCategory extends BaseToolCategory {
  name: string = 'exec';

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
   * Execute a command in a terminal
   * Schema:
   * - command: string (required) - The command to execute
   * - tabId: string (optional) - The ID of the tab to execute in, defaults to active tab
   * - timeout: number (optional) - Milliseconds to wait for command completion, default 1000
   */
  private execCommand(): McpTool<any> {
    return {
      name: 'exec_command',
      description: 'Execute a command in a terminal session and return the output',
      schema: {
        command: z.string().describe('Command to execute in the terminal'),
        tabId: z.string().optional().describe('Tab ID to execute in, get from get_ssh_session_list'),
        timeout: z.number().optional().describe('Milliseconds to wait for command completion, default 1000')
      },
      handler: async (params, extra) => {
        const {
          command,
          tabId,
          timeout = 1000
        } = params;

        const sessions = this.findAndSerializeTerminalSessions();
        const session = sessions.find(s => s.id === parseInt(tabId, 10));
        
        if (!session) {
          return createErrorResponse('Invalid tab ID');
        }

        console.log(`[DEBUG] Execute command: ${command}, tabIndex: ${session.id}, timeout: ${timeout}`);

        try {
          // Prepare command with marker for output tracking
          const timestamp = Date.now();
          const startMarker = `TABBY_OUTPUT_START_${timestamp}`;
          const wrappedCommand = `echo '${startMarker}' && ${command}`;

          console.log(`[DEBUG] Executing wrapped command: ${wrappedCommand}`);

          // Execute the command
          session.tab.sendInput(wrappedCommand + "\r");

          // Wait for command to complete
          console.log(`[DEBUG] Waiting ${timeout}ms for command to complete...`);
          await new Promise<void>(resolve => setTimeout(resolve, timeout));
          console.log(`[DEBUG] Wait completed`);

          // Get terminal buffer content
          let textAfter = "";
          if (session.tab.frontend instanceof XTermFrontend) {
            if (!session.tab.frontend.xterm['_serializeAddon']) {
              const addon = new SerializeAddon();
              session.tab.frontend.xterm.loadAddon(addon);
              session.tab.frontend.xterm['_serializeAddon'] = addon; // lưu lại nếu cần dùng nhiều lần
              console.log('✅ SerializeAddon loaded');
            }
            textAfter = session.tab.frontend.xterm['_serializeAddon'].serialize();
            
            console.log(`[DEBUG] Buffer text after (length: ${textAfter.length})`);
          }

          // Extract command output from buffer
          let output = '';
          if (textAfter) {
            // Clean ANSI codes for easier parsing
            const cleanTextAfter = stripAnsi(textAfter);
            const lines = cleanTextAfter.split('\n');

            // Find the marker line
            let markerLineIndex = -1;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(startMarker)) {
                markerLineIndex = i;
                break;
              }
            }

            // Extract output after marker, but before prompt
            if (markerLineIndex !== -1 && markerLineIndex < lines.length - 1) {
              // Extract all lines after the marker
              const remainingLines = lines.slice(markerLineIndex + 1);
              
              // Find the command output (between marker and next prompt)
              let commandOutput: string[] = [];
              let insideOutput = true;
              
              for (let i = 0; i < remainingLines.length; i++) {
                const line = remainingLines[i].trim();
                
                // Skip the first empty lines after the marker
                if (commandOutput.length === 0 && line === '') {
                  continue;
                }
                
                // Stop extracting when we detect a prompt pattern
                if (line.includes('#') || line.includes('$') || line.includes('>')) {
                  // Only consider it a prompt if it's at the end of a line with username/hostname pattern
                  if (line.match(/[@:].*[#$>](\s*)$/)) {
                    insideOutput = false;
                    break;
                  }
                }
                
                if (insideOutput) {
                  commandOutput.push(line);
                }
              }
              
              output = commandOutput.join('\n').trim().replace(startMarker, '');
              console.log(`[DEBUG] Found marker at line ${markerLineIndex}, extracted command output: "${output}"`);
            } else {
              // Fallback: use entire buffer if marker not found
              output = cleanTextAfter;
              console.log(`[DEBUG] Could not find marker or it was the last line, using entire buffer`);
            }
          }

          console.log(`[DEBUG] Command executed: ${command}, tabIndex: ${session.id}, output length: ${output.length}`);
          
          return createSuccessResponse(output);
        } catch (err) {
          console.error(`[DEBUG] Error capturing command output:`, err);
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