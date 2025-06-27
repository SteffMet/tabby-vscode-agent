import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription, interval } from 'rxjs';
import { RunningCommandsManagerService, RunningCommand as RunningCommandBase } from '../services/runningCommandsManager.service';
import { ExecToolCategory } from '../tools/terminal';

export interface RunningCommand extends RunningCommandBase {
  duration: string;
}

@Component({
  selector: 'running-commands-modal',
  template: `
    <div class="modal-header">
      <h4 class="modal-title">
        <i class="fas fa-play-circle me-2"></i>
        Running Commands ({{runningCommands.length}})
      </h4>
      <button type="button" class="btn-close" (click)="close()"></button>
    </div>
    
    <div class="modal-body">
      <div *ngIf="runningCommands.length === 0" class="text-center text-muted py-4">
        <i class="fas fa-coffee fa-3x mb-3"></i>
        <p>No commands currently running</p>
      </div>
      
      <div class="list-group" *ngIf="runningCommands.length > 0">
        <div *ngFor="let cmd of runningCommands" 
             class="list-group-item">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h6 class="mb-1">
                <i class="fas fa-terminal me-2"></i>
                {{getCommandPreview(cmd.command)}}
              </h6>
              <div class="d-flex align-items-center gap-3">
                <small class="text-muted">
                  <i class="fas fa-tv me-1"></i>
                  Terminal {{cmd.tabId}}
                </small>
                <small class="text-success">
                  <i class="fas fa-clock me-1"></i>
                  {{cmd.duration}}
                </small>
              </div>
              <div class="mt-2">
                <code class="text-muted">{{cmd.command}}</code>
              </div>
            </div>
            <div class="ms-3">
              <button 
                class="btn btn-sm btn-outline-danger"
                (click)="stopCommand(cmd.tabId)"
                title="Stop command">
                <i class="fas fa-stop me-1"></i>
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modal-footer">
      <div class="me-auto">
        <small class="text-muted">
          <i class="fas fa-info-circle me-1"></i>
          Auto-refreshing every 2 seconds
        </small>
      </div>
      <button class="btn btn-outline-danger me-2" 
              (click)="stopAllCommands()" 
              *ngIf="runningCommands.length > 0">
        <i class="fas fa-stop me-1"></i>
        Stop All
      </button>
      <button class="btn btn-secondary" (click)="close()">
        Close
      </button>
    </div>
  `,
  styles: [`
    .list-group-item {
      border-left: 3px solid #28a745;
    }
    
    .modal-body {
      max-height: 500px;
      overflow-y: auto;
    }
    
    code {
      font-size: 0.85em;
      word-break: break-all;
    }
    
    .running-indicator {
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `]
})
export class RunningCommandsDialogComponent implements OnInit, OnDestroy {
  runningCommands: RunningCommand[] = [];
  private refreshSubscription: Subscription;

  constructor(
    private activeModal: NgbActiveModal,
    private runningCommandsManager: RunningCommandsManagerService,
    private execToolCategory: ExecToolCategory
  ) { }

  ngOnInit(): void {
    this.refreshRunningCommands();
    
    // Auto-refresh every 2 seconds
    this.refreshSubscription = interval(2000).subscribe(() => {
      this.refreshRunningCommands();
    });

    // Subscribe to running commands changes
    this.runningCommandsManager.runningCommands$.subscribe(commands => {
      this.refreshRunningCommands();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  close(): void {
    this.activeModal.dismiss();
  }

  private refreshRunningCommands(): void {
    const commands: RunningCommand[] = [];
    const now = Date.now();

    const runningCommands = this.runningCommandsManager.getAllRunningCommands();
    runningCommands.forEach((cmdInfo) => {
      const duration = this.formatDuration(now - cmdInfo.startTime);
      commands.push({
        tabId: cmdInfo.tabId,
        command: cmdInfo.command,
        startTime: cmdInfo.startTime,
        duration
      });
    });

    this.runningCommands = commands.sort((a, b) => b.startTime - a.startTime);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getCommandPreview(command: string): string {
    if (command.length <= 50) {
      return command;
    }
    return command.substring(0, 47) + '...';
  }

  async stopCommand(tabId: string): Promise<void> {
    try {
      console.log(`Stopping command in terminal ${tabId}`);
      // Use the exec tool category to abort the command
      this.execToolCategory.abortCommand(parseInt(tabId));
      
      console.log(`Command in terminal ${tabId} stopped`);
    } catch (error) {
      console.error(`Error stopping command in terminal ${tabId}:`, error);
    }
  }

  async stopAllCommands(): Promise<void> {
    const stopPromises = this.runningCommands.map(cmd => this.stopCommand(cmd.tabId));
    await Promise.all(stopPromises);
  }
} 