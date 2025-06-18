import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { McpLoggerService } from './mcpLogger.service';

/**
 * Interface for command history entry
 */
export interface CommandHistoryEntry {
  id: string;
  command: string;
  output: string;
  promptShell: string | null;
  exitCode: number | null;
  timestamp: number;
  aborted: boolean;
  tabId: string;
  tabTitle?: string;
  duration?: number; // execution duration in milliseconds
}

/**
 * Service to manage command execution history
 */
@Injectable({ providedIn: 'root' })
export class CommandHistoryManagerService {
  private readonly MAX_HISTORY_ENTRIES = 1000;
  private commandHistory = new BehaviorSubject<CommandHistoryEntry[]>([]);
  
  /** Observable for command history */
  get commandHistory$(): Observable<CommandHistoryEntry[]> {
    return this.commandHistory.asObservable();
  }

  /** Get current command history */
  get history(): CommandHistoryEntry[] {
    return this.commandHistory.value;
  }

  constructor(private logger: McpLoggerService) {
    this.logger.info('CommandHistoryManagerService initialized');
    this.loadHistoryFromStorage();
  }

  /**
   * Add a command to history
   */
  addCommand(entry: Omit<CommandHistoryEntry, 'id'>): string {
    const id = this.generateEntryId();
    const historyEntry: CommandHistoryEntry = {
      ...entry,
      id
    };

    const current = this.commandHistory.value;
    const updated = [historyEntry, ...current];

    // Keep only the most recent entries
    if (updated.length > this.MAX_HISTORY_ENTRIES) {
      updated.splice(this.MAX_HISTORY_ENTRIES);
    }

    this.commandHistory.next(updated);
    this.saveHistoryToStorage();
    
    this.logger.info(`Added command to history: ${entry.command} (ID: ${id})`);
    return id;
  }

  /**
   * Get a command from history by ID
   */
  getCommand(id: string): CommandHistoryEntry | null {
    return this.commandHistory.value.find(entry => entry.id === id) || null;
  }

  /**
   * Remove a command from history
   */
  removeCommand(id: string): boolean {
    const current = this.commandHistory.value;
    const updated = current.filter(entry => entry.id !== id);
    
    if (updated.length !== current.length) {
      this.commandHistory.next(updated);
      this.saveHistoryToStorage();
      this.logger.info(`Removed command from history: ${id}`);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all command history
   */
  clearHistory(): void {
    this.commandHistory.next([]);
    this.saveHistoryToStorage();
    this.logger.info('Cleared all command history');
  }

  /**
   * Get filtered history by search term
   */
  searchHistory(searchTerm: string): CommandHistoryEntry[] {
    if (!searchTerm.trim()) {
      return this.commandHistory.value;
    }

    const term = searchTerm.toLowerCase();
    return this.commandHistory.value.filter(entry =>
      entry.command.toLowerCase().includes(term) ||
      entry.output.toLowerCase().includes(term) ||
      (entry.tabTitle && entry.tabTitle.toLowerCase().includes(term))
    );
  }

  /**
   * Get history filtered by success/failure
   */
  getFilteredHistory(filter: 'all' | 'success' | 'failed' | 'aborted'): CommandHistoryEntry[] {
    const history = this.commandHistory.value;
    console.log('[CommandHistoryManager] getFilteredHistory called with filter:', filter, 'total entries:', history.length);
    
    switch (filter) {
      case 'success':
        const successEntries = history.filter(entry => !entry.aborted && entry.exitCode === 0);
        console.log('[CommandHistoryManager] Success entries:', successEntries.length);
        return successEntries;
      case 'failed':
        const failedEntries = history.filter(entry => !entry.aborted && entry.exitCode !== 0);
        console.log('[CommandHistoryManager] Failed entries:', failedEntries.length);
        return failedEntries;
      case 'aborted':
        const abortedEntries = history.filter(entry => entry.aborted);
        console.log('[CommandHistoryManager] Aborted entries:', abortedEntries.length);
        return abortedEntries;
      default:
        console.log('[CommandHistoryManager] All entries:', history.length);
        return history;
    }
  }

  /**
   * Copy command to clipboard
   */
  async copyCommand(id: string): Promise<boolean> {
    const entry = this.getCommand(id);
    if (!entry) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(entry.command);
      this.logger.info(`Copied command to clipboard: ${entry.command}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to copy command to clipboard:', error);
      return false;
    }
  }

  /**
   * Copy command output to clipboard
   */
  async copyOutput(id: string): Promise<boolean> {
    const entry = this.getCommand(id);
    if (!entry) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(entry.output);
      this.logger.info(`Copied output to clipboard for command: ${entry.command}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to copy output to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save history to localStorage
   */
  private saveHistoryToStorage(): void {
    try {
      const history = this.commandHistory.value;
      localStorage.setItem('mcp_command_history', JSON.stringify(history));
    } catch (error) {
      this.logger.error('Failed to save history to storage:', error);
    }
  }

  /**
   * Load history from localStorage
   */
  private loadHistoryFromStorage(): void {
    try {
      console.log('[CommandHistoryManager] Loading history from localStorage...');
      const stored = localStorage.getItem('mcp_command_history');
      console.log('[CommandHistoryManager] Stored data:', stored);
      
      if (stored) {
        const history: CommandHistoryEntry[] = JSON.parse(stored);
        console.log('[CommandHistoryManager] Parsed history:', history.length, 'entries');
        
        // Validate and filter valid entries
        const validHistory = history.filter(entry => 
          entry.id && entry.command && entry.timestamp
        );
        console.log('[CommandHistoryManager] Valid history:', validHistory.length, 'entries');
        
        this.commandHistory.next(validHistory);
        this.logger.info(`Loaded ${validHistory.length} entries from history storage`);
      } else {
        console.log('[CommandHistoryManager] No stored history found');
        this.commandHistory.next([]);
      }
    } catch (error) {
      console.error('[CommandHistoryManager] Error loading history:', error);
      this.logger.error('Failed to load history from storage:', error);
      this.commandHistory.next([]);
    }
  }
} 