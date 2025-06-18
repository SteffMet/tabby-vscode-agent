import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface RunningCommand {
  tabId: string;
  command: string;
  startTime: number;
}

@Injectable({ providedIn: 'root' })
export class RunningCommandsManagerService {
  private runningCommandsSubject = new BehaviorSubject<RunningCommand[]>([]);
  public runningCommands$ = this.runningCommandsSubject.asObservable();

  private runningCommands = new Map<string, RunningCommand>();

  constructor() {}

  /**
   * Get current running commands as observable
   */
  getRunningCommands(): Observable<RunningCommand[]> {
    return this.runningCommands$;
  }

  /**
   * Get current running commands count
   */
  getRunningCommandsCount(): number {
    return this.runningCommands.size;
  }

  /**
   * Start tracking a command
   */
  startCommand(tabId: string, command: string): void {
    const runningCommand: RunningCommand = {
      tabId,
      command,
      startTime: Date.now()
    };

    this.runningCommands.set(tabId, runningCommand);
    this.updateSubject();
  }

  /**
   * Stop tracking a command
   */
  endCommand(tabId: string): void {
    this.runningCommands.delete(tabId);
    this.updateSubject();
  }

  /**
   * Get all running commands as array
   */
  getAllRunningCommands(): RunningCommand[] {
    return Array.from(this.runningCommands.values());
  }

  /**
   * Check if a command is running in a specific tab
   */
  isCommandRunning(tabId: string): boolean {
    return this.runningCommands.has(tabId);
  }

  /**
   * Get running command for a specific tab
   */
  getRunningCommand(tabId: string): RunningCommand | undefined {
    return this.runningCommands.get(tabId);
  }

  /**
   * Clear all running commands (useful for cleanup)
   */
  clearAll(): void {
    this.runningCommands.clear();
    this.updateSubject();
  }

  private updateSubject(): void {
    this.runningCommandsSubject.next(this.getAllRunningCommands());
  }
} 