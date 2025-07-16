import { Injectable } from '@angular/core';
import { AppService, BaseTabComponent, ConfigService, HostWindowService, SplitTabComponent } from 'tabby-core';
import { BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal';
import { BaseToolCategory } from './base-tool-category';
import { SerializeAddon } from '@xterm/addon-serialize';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ShellContext } from './shell-strategy';
import { McpLoggerService } from '../services/mcpLogger.service';
import { CommandOutputStorageService } from '../services/commandOutputStorage.service';
import { CommandHistoryManagerService } from '../services/commandHistoryManager.service';
import { DialogService } from '../services/dialog.service';
import { RunningCommandsManagerService } from '../services/runningCommandsManager.service';
import {
  SshSessionListTool,
  ExecCommandTool,
  GetTerminalBufferTool,
  GetCommandOutputTool,
  OpenCopilotTool
} from './terminal/';

/**
 * Interface for terminal tab component with ID
 */
export interface BaseTerminalTabComponentWithId {
  id: number;
  tabParent: BaseTabComponent;
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

  // Track active commands per session (sessionId -> ActiveCommand)
  private _activeCommands = new Map<number, ActiveCommand>();
  private _activeCommandsSubject = new BehaviorSubject<Map<number, ActiveCommand>>(new Map());

  // Observable for UI to subscribe to
  public readonly activeCommands$ = this._activeCommandsSubject.asObservable();
  
  // Legacy observable for backward compatibility (returns any active command)
  public readonly activeCommand$ = this._activeCommandsSubject.asObservable().pipe(
    map(commands => commands.size > 0 ? Array.from(commands.values())[0] : null)
  );

  // Shell context for managing different shell types
  public shellContext = new ShellContext();

  constructor(
    private app: AppService,
    logger: McpLoggerService,
    private config: ConfigService,
    private dialogService: DialogService,
    private commandHistoryManager: CommandHistoryManagerService,
    private runningCommandsManager: RunningCommandsManagerService
  ) {
    super(logger);

    // Log discovered terminal sessions for debugging
    this.findAndSerializeTerminalSessions().forEach(session => {
      this.logger.debug(`Found session: ${session.id}, ${session.tab.title}`);
    });

    // Initialize and register all tools
    this.initializeTools();
  }

  /**
   * Initialize and register all tools
   */
  private initializeTools(): void {
    // Create shared storage service for command outputs
    const commandOutputStorage = new CommandOutputStorageService(this.logger);

    // Create tool instances
    const sshSessionListTool = new SshSessionListTool(this, this.logger);
    const execCommandTool = new ExecCommandTool(
      this,
      this.logger,
      this.config,
      this.dialogService,
      this.app,
      this.runningCommandsManager,
      commandOutputStorage,
      this.commandHistoryManager
    );
    const getTerminalBufferTool = new GetTerminalBufferTool(this, this.logger);
    const getCommandOutputTool = new GetCommandOutputTool(this.logger, commandOutputStorage);
    const openCopilotTool = new OpenCopilotTool(this.app, this.logger);

    // Register tools
    this.registerTool(sshSessionListTool.getTool());
    this.registerTool(execCommandTool.getTool());
    this.registerTool(getTerminalBufferTool.getTool());
    this.registerTool(getCommandOutputTool.getTool());
    this.registerTool(openCopilotTool.getTool());
  }

  /**
   * Get current active command (legacy - returns first active command)
   */
  public get activeCommand(): ActiveCommand | null {
    return this._activeCommands.size > 0 ? Array.from(this._activeCommands.values())[0] : null;
  }

  /**
   * Get active command for specific session
   */
  public getActiveCommand(sessionId: number): ActiveCommand | null {
    return this._activeCommands.get(sessionId) || null;
  }

  /**
   * Set active command for a session and notify subscribers
   */
  public setActiveCommand(command: ActiveCommand | null): void {
    if (command) {
      this._activeCommands.set(command.tabId, command);
      this.logger.debug(`Active command set for session ${command.tabId}: ${command.command}`);
    } else {
      // Legacy behavior - if command is null, clear the first active command
      if (this._activeCommands.size > 0) {
        const firstSessionId = Array.from(this._activeCommands.keys())[0];
        this._activeCommands.delete(firstSessionId);
        this.logger.debug(`Active command cleared for session ${firstSessionId}`);
      }
    }
    this._activeCommandsSubject.next(new Map(this._activeCommands));
  }

  /**
   * Clear active command for specific session
   */
  public clearActiveCommand(sessionId: number): void {
    if (this._activeCommands.has(sessionId)) {
      this._activeCommands.delete(sessionId);
      this._activeCommandsSubject.next(new Map(this._activeCommands));
      this.logger.debug(`Active command cleared for session ${sessionId}`);
    }
  }

  /**
   * Abort command for specific session
   */
  public abortCommand(sessionId: number): void {
    const activeCommand = this._activeCommands.get(sessionId);
    if (activeCommand) {
      // Find the terminal session for this command
      const sessions = this.findAndSerializeTerminalSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session) {
        // Send Ctrl+C to interrupt the command
        this.logger.debug(`Sending Ctrl+C to abort command in session ${sessionId}: ${activeCommand.command}`);
        session.tab.sendInput('\x03'); // Ctrl+C
      }
      
      // Call the abort handler which sets the aborted flag
      activeCommand.abort();
      
      // Remove from active commands
      this._activeCommands.delete(sessionId);
      this._activeCommandsSubject.next(new Map(this._activeCommands));
      this.logger.debug(`Command aborted for session ${sessionId}`);
    }
  }

  /**
   * Abort the current command if any (legacy method)
   */
  public abortCurrentCommand(): void {
    if (this._activeCommands.size > 0) {
      const firstSessionId = Array.from(this._activeCommands.keys())[0];
      this.abortCommand(firstSessionId);
    }
  }

  /**
   * Find all terminal sessions and map them to a serializable format
   * @returns Array of terminal sessions with IDs
   */
  public findAndSerializeTerminalSessions(): BaseTerminalTabComponentWithId[] {
    const sessions: BaseTerminalTabComponentWithId[] = [];
    let id = 0;
    this.app.tabs.forEach((tab, tabIdx) => {
      if (tab instanceof BaseTerminalTabComponent) {
        sessions.push({
          id: id++,
          tabParent: tab,
          tab: tab as BaseTerminalTabComponent<any>
        });
      } else if (tab instanceof SplitTabComponent) {
        sessions.push(...tab.getAllTabs()
          .filter(childTab => childTab instanceof BaseTerminalTabComponent && (childTab as BaseTerminalTabComponent<any>).frontend !== undefined)
          .map(childTab => ({
            id: id++,
            tabParent: tab,
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
        this.logger.error(`No xterm frontend available for session ${session.id}`);
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
      this.logger.error(`Error getting terminal buffer:`, err);
      return '';
    }
  }
}