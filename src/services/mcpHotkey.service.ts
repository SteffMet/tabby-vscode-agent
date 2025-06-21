import { Injectable } from '@angular/core';
import { HotkeysService } from 'tabby-core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExecToolCategory } from '../tools/terminal';
import { McpLoggerService } from './mcpLogger.service';
import { CommandHistoryModalComponent } from '../components/commandHistoryModal.component';
import { RunningCommandsDialogComponent } from '../components/runningCommandsDialog.component';

/**
 * Service for handling MCP-related hotkeys
 */
@Injectable({ providedIn: 'root' })
export class McpHotkeyService {
  constructor(
    private hotkeysService: HotkeysService,
    private execToolCategory: ExecToolCategory,
    private logger: McpLoggerService,
    private modal: NgbModal,
  ) {
    this.logger.info('McpHotkeyService initialized');
    this.initializeHotkeys();
  }

  private initializeHotkeys(): void {
    // Subscribe to hotkey events
    this.hotkeysService.matchedHotkey.subscribe(async (hotkey) => {
      if (hotkey === 'mcp-abort-command') {
        this.abortFocusedCommand();
      } else if (hotkey === 'mcp-show-command-history') {
        this.showCommandHistory();
      } else if (hotkey === 'mcp-show-running-commands') {
        this.showRunningCommands();
      }
    });
  }

  /**
   * Abort command in the currently focused terminal session
   */
  private abortFocusedCommand(): void {
    try {
      // Find all terminal sessions
      const sessions = this.execToolCategory.findAndSerializeTerminalSessions();
      
      // Find the focused session
      const focusedSession = sessions.find(s => s.tab.hasFocus);
      
      if (!focusedSession) {
        this.logger.warn('No focused terminal session found for abort command');
        return;
      }

      // Check if there's an active command in the focused session
      const activeCommand = this.execToolCategory.getActiveCommand(focusedSession.id);
      
      if (!activeCommand) {
        this.logger.info(`No active command to abort in focused session ${focusedSession.id}`);
        return;
      }

      this.logger.info(`Aborting command in focused session ${focusedSession.id}: ${activeCommand.command}`);
      
      // Abort the command
      this.execToolCategory.abortCommand(focusedSession.id);
      
    } catch (error) {
      this.logger.error('Error aborting focused command:', error);
    }
  }

  /**
   * Show command history dialog
   */
  private showCommandHistory(): void {
    try {
      this.logger.info('Showing command history via hotkey');
      this.modal.open(CommandHistoryModalComponent, {
        size: 'xl',
        backdrop: true,
        keyboard: true
      });
    } catch (error) {
      this.logger.error('Error showing command history:', error);
    }
  }

  /**
   * Show running commands dialog
   */
  private showRunningCommands(): void {
    try {
      this.logger.info('Showing running commands via hotkey');
      this.modal.open(RunningCommandsDialogComponent, {
        size: 'lg',
        backdrop: true,
        keyboard: true
      });
    } catch (error) {
      this.logger.error('Error showing running commands:', error);
    }
  }
}