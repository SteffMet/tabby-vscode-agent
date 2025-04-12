import { Injectable } from '@angular/core';
import { AppService, SplitTabComponent } from 'tabby-core';
import { BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal';
import { BaseToolCategory } from './base-tool-category';
import { McpTool } from '../type/types';
import { SerializeAddon } from '@xterm/addon-serialize';
import { BehaviorSubject } from 'rxjs';
import { ShellContext } from './shell-strategy';
import { 
  SshSessionListTool, 
  AbortCommandTool, 
  ExecCommandTool, 
  GetTerminalBufferTool 
} from './terminal/';

/**
 * Interface for terminal tab component with ID
 */
export interface BaseTerminalTabComponentWithId {
  id: number;
  tab: BaseTerminalTabComponent<any>;
}

/**
 * Interface for tracking active command
 */
export interface ActiveCommand {
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
  public shellContext = new ShellContext();

  constructor(private app: AppService) {
    super();
    
    // Log discovered terminal sessions for debugging
    this.findAndSerializeTerminalSessions().forEach(session => {
      console.log(`[DEBUG] Found session: ${session.id}, ${session.tab.title}`);
    });
    
    // Initialize and register all tools
    this.initializeTools();
  }

  /**
   * Initialize and register all tools
   */
  private initializeTools(): void {
    // Create tool instances
    const sshSessionListTool = new SshSessionListTool(this);
    const abortCommandTool = new AbortCommandTool(this);
    const execCommandTool = new ExecCommandTool(this);
    const getTerminalBufferTool = new GetTerminalBufferTool(this);

    // Register tools
    this.registerTool(sshSessionListTool.getTool());
    this.registerTool(abortCommandTool.getTool());
    this.registerTool(execCommandTool.getTool());
    this.registerTool(getTerminalBufferTool.getTool());
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
  public setActiveCommand(command: ActiveCommand | null): void {
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
   * Find all terminal sessions and map them to a serializable format
   * @returns Array of terminal sessions with IDs
   */
  public findAndSerializeTerminalSessions(): BaseTerminalTabComponentWithId[] {
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
   * Get terminal buffer content as text
   * @param session The terminal session
   * @returns The terminal buffer content as text
   */
  public getTerminalBufferText(session: BaseTerminalTabComponentWithId): string {
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
}