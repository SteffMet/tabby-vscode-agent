import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CommandHistoryManagerService, CommandHistoryEntry } from '../services/commandHistoryManager.service';

@Component({
  selector: 'command-history-modal',
  template: `
    <div class="modal-header">
      <h4 class="modal-title">
        <i class="fas fa-history me-2"></i>
        Command History ({{filteredHistory.length}})
      </h4>
      <button type="button" class="btn-close" (click)="close()"></button>
    </div>
    
    <div class="modal-body">
      <!-- Search and Filter Controls -->
      <div class="row mb-3">
        <div class="col-md-8">
          <div class="input-group">
            <span class="input-group-text">
              <i class="fas fa-search"></i>
            </span>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search commands or output..." 
              [(ngModel)]="searchTerm"
              (input)="onSearchChange()">
            <button 
              class="btn btn-outline-secondary" 
              type="button"
              (click)="clearSearch()"
              *ngIf="searchTerm"
              title="Clear search">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="col-md-4">
          <select 
            class="form-select" 
            [(ngModel)]="filterType"
            (change)="onFilterChange()">
            <option value="all">All Commands</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
            <option value="aborted">Aborted</option>
          </select>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="filteredHistory.length === 0 && !searchTerm" class="text-center text-muted py-4">
        <i class="fas fa-history fa-3x mb-3"></i>
        <p>No command history available</p>
        <small>Commands will appear here after execution</small>
      </div>

      <!-- No Results State -->
      <div *ngIf="filteredHistory.length === 0 && searchTerm" class="text-center text-muted py-4">
        <i class="fas fa-search fa-3x mb-3"></i>
        <p>No commands found</p>
        <small>Try adjusting your search terms or filters</small>
      </div>
      
      <!-- History List -->
      <div class="history-list" *ngIf="filteredHistory.length > 0">
        <div *ngFor="let entry of filteredHistory; trackBy: trackByEntryId" 
             class="history-entry border rounded mb-3 p-3">
          
          <!-- Entry Header -->
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center mb-1">
                <span class="badge me-2" 
                      [ngClass]="getStatusBadgeClass(entry)">
                  <i class="fas" [ngClass]="getStatusIcon(entry)"></i>
                  {{getStatusText(entry)}}
                </span>
                <small class="text-muted">
                  <i class="fas fa-clock me-1"></i>
                  {{getRelativeTime(entry.timestamp)}}
                </small>
                <small class="text-muted ms-2" *ngIf="entry.tabTitle">
                  <i class="fas fa-terminal me-1"></i>
                  {{entry.tabTitle}}
                </small>
                <small class="text-muted ms-2" *ngIf="entry.duration">
                  <i class="fas fa-stopwatch me-1"></i>
                  {{formatDuration(entry.duration)}}
                </small>
              </div>
            </div>
            <div class="btn-group" role="group">
              <button 
                class="btn btn-sm btn-outline-primary"
                (click)="copyCommand(entry.id)"
                title="Copy command">
                <i class="fas fa-copy"></i>
              </button>
              <button 
                class="btn btn-sm btn-outline-secondary"
                (click)="copyOutput(entry.id)"
                title="Copy output"
                [disabled]="!entry.output">
                <i class="fas fa-clipboard"></i>
              </button>
              <button 
                class="btn btn-sm btn-outline-danger"
                (click)="removeEntry(entry.id)"
                title="Remove from history">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- Command -->
          <div class="command-section mb-2">
            <strong class="text-primary">Command:</strong>
            <code class="d-block bg-light p-2 rounded mt-1">{{entry.command}}</code>
          </div>

          <!-- Output (truncated) -->
          <div class="output-section" *ngIf="entry.output">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <strong class="text-secondary">Output:</strong>
              <button 
                class="btn btn-sm btn-link p-0"
                (click)="toggleOutputExpanded(entry.id)"
                *ngIf="entry.output.length > 200">
                {{isOutputExpanded(entry.id) ? 'Show Less' : 'Show More'}}
              </button>
            </div>
            <pre class="bg-dark text-light p-2 rounded output-text">{{getDisplayOutput(entry)}}</pre>
          </div>

          <!-- Exit Code -->
          <div class="mt-2" *ngIf="entry.exitCode !== null">
            <small class="text-muted">
              <strong>Exit Code:</strong> 
              <span [ngClass]="entry.exitCode === 0 ? 'text-success' : 'text-danger'">
                {{entry.exitCode}}
              </span>
            </small>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modal-footer" *ngIf="filteredHistory.length > 0">
      <div class="me-auto">
        <small class="text-muted">
          Showing {{filteredHistory.length}} of {{totalHistory}} commands
        </small>
      </div>
      
      <!-- Export Dropdown -->
      <div class="dropdown me-2" ngbDropdown>
        <button class="btn btn-outline-success dropdown-toggle" type="button" ngbDropdownToggle>
          <i class="fas fa-download me-1"></i>
          Export History
        </button>
        <div class="dropdown-menu" ngbDropdownMenu>
          <h6 class="dropdown-header">
            <i class="fas fa-file-export me-1"></i>
            Export Current View ({{filteredHistory.length}} commands)
          </h6>
          <button class="dropdown-item" ngbDropdownItem (click)="exportCommandsOnly(false)">
            <i class="fas fa-terminal me-2"></i>
            Commands Only (TXT)
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportCommandsWithOutput(false)">
            <i class="fas fa-file-alt me-2"></i>
            Commands with Output (TXT)
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportAsJSON(false)">
            <i class="fas fa-code me-2"></i>
            Export as JSON
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportAsCSV(false)">
            <i class="fas fa-table me-2"></i>
            Export as CSV
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportAsMarkdown(false)">
            <i class="fab fa-markdown me-2"></i>
            Export as Markdown
          </button>
          <div class="dropdown-divider"></div>
          <h6 class="dropdown-header">
            <i class="fas fa-clipboard me-1"></i>
            Copy to Clipboard
          </h6>
          <button class="dropdown-item" ngbDropdownItem (click)="copyCommandsOnly()">
            <i class="fas fa-copy me-2"></i>
            Copy Commands Only
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="copyCommandsWithOutput()">
            <i class="fas fa-clipboard me-2"></i>
            Copy with Output
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="copyAsJSON()">
            <i class="fas fa-code me-2"></i>
            Copy as JSON
          </button>
          <div class="dropdown-divider"></div>
          <h6 class="dropdown-header">
            <i class="fas fa-history me-1"></i>
            Export All History ({{totalHistory}} commands)
          </h6>
          <button class="dropdown-item" ngbDropdownItem (click)="exportCommandsOnly(true)">
            <i class="fas fa-terminal me-2"></i>
            All Commands Only (TXT)
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportCommandsWithOutput(true)">
            <i class="fas fa-file-alt me-2"></i>
            All Commands with Output (TXT)
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportAsJSON(true)">
            <i class="fas fa-code me-2"></i>
            All History as JSON
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportAsCSV(true)">
            <i class="fas fa-table me-2"></i>
            All History as CSV
          </button>
          <button class="dropdown-item" ngbDropdownItem (click)="exportAsMarkdown(true)">
            <i class="fab fa-markdown me-2"></i>
            All History as Markdown
          </button>
        </div>
      </div>
      
      <button class="btn btn-outline-danger me-2" (click)="clearAllHistory()">
        <i class="fas fa-trash me-1"></i>
        Clear All History
      </button>
      <button class="btn btn-secondary" (click)="close()">
        Close
      </button>
    </div>
  `,
  styleUrls: ['./commandHistoryModal.component.scss'],
})
export class CommandHistoryModalComponent implements OnInit, OnDestroy {
  filteredHistory: CommandHistoryEntry[] = [];
  totalHistory: number = 0;
  searchTerm: string = '';
  filterType: 'all' | 'success' | 'failed' | 'aborted' = 'all';
  private expandedOutputs = new Set<string>();
  private subscription: Subscription;

  constructor(
    private activeModal: NgbActiveModal,
    private historyManager: CommandHistoryManagerService
  ) { }

  ngOnInit(): void {
    console.log('[CommandHistoryModal] Initializing, historyManager:', this.historyManager);
    console.log('[CommandHistoryModal] Current history:', this.historyManager.history);
    
    this.subscription = this.historyManager.commandHistory$.subscribe(history => {
      console.log('[CommandHistoryModal] History updated:', history.length, 'entries');
      this.totalHistory = history.length;
      this.updateFilteredHistory();
    });
    
    // Initial load
    this.updateFilteredHistory();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  close(): void {
    this.activeModal.dismiss();
  }

  onSearchChange(): void {
    this.updateFilteredHistory();
  }

  onFilterChange(): void {
    this.updateFilteredHistory();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.updateFilteredHistory();
  }

  private updateFilteredHistory(): void {
    console.log('[CommandHistoryModal] Updating filtered history, filterType:', this.filterType, 'searchTerm:', this.searchTerm);
    
    let history = this.historyManager.getFilteredHistory(this.filterType);
    console.log('[CommandHistoryModal] After getFilteredHistory:', history.length, 'entries');
    
    if (this.searchTerm.trim()) {
      history = this.historyManager.searchHistory(this.searchTerm);
      console.log('[CommandHistoryModal] After searchHistory:', history.length, 'entries');
      // Apply filter to search results
      if (this.filterType !== 'all') {
        history = history.filter(entry => {
          switch (this.filterType) {
            case 'success':
              return !entry.aborted && entry.exitCode === 0;
            case 'failed':
              return !entry.aborted && entry.exitCode !== 0;
            case 'aborted':
              return entry.aborted;
            default:
              return true;
          }
        });
        console.log('[CommandHistoryModal] After applying filter to search results:', history.length, 'entries');
      }
    }
    
    console.log('[CommandHistoryModal] Final filtered history:', history.length, 'entries');
    this.filteredHistory = history;
  }

  async copyCommand(id: string): Promise<void> {
    const success = await this.historyManager.copyCommand(id);
    if (success) {
      // Could show a toast notification here
      console.log('Command copied to clipboard');
    }
  }

  async copyOutput(id: string): Promise<void> {
    const success = await this.historyManager.copyOutput(id);
    if (success) {
      // Could show a toast notification here
      console.log('Output copied to clipboard');
    }
  }

  removeEntry(id: string): void {
    this.historyManager.removeCommand(id);
  }

  clearAllHistory(): void {
    if (confirm('Are you sure you want to clear all command history? This action cannot be undone.')) {
      this.historyManager.clearHistory();
    }
  }

  toggleOutputExpanded(id: string): void {
    if (this.expandedOutputs.has(id)) {
      this.expandedOutputs.delete(id);
    } else {
      this.expandedOutputs.add(id);
    }
  }

  isOutputExpanded(id: string): boolean {
    return this.expandedOutputs.has(id);
  }

  getDisplayOutput(entry: CommandHistoryEntry): string {
    if (!entry.output) return '';
    
    if (this.isOutputExpanded(entry.id)) {
      return entry.output;
    }
    
    // Truncate output to first 200 characters
    return entry.output.length > 200 
      ? entry.output.substring(0, 200) + '...'
      : entry.output;
  }

  getStatusBadgeClass(entry: CommandHistoryEntry): string {
    if (entry.aborted) {
      return 'bg-warning';
    } else if (entry.exitCode === 0) {
      return 'bg-success';
    } else {
      return 'bg-danger';
    }
  }

  getStatusIcon(entry: CommandHistoryEntry): string {
    if (entry.aborted) {
      return 'fa-ban';
    } else if (entry.exitCode === 0) {
      return 'fa-check';
    } else {
      return 'fa-times';
    }
  }

  getStatusText(entry: CommandHistoryEntry): string {
    if (entry.aborted) {
      return 'Aborted';
    } else if (entry.exitCode === 0) {
      return 'Success';
    } else {
      return 'Failed';
    }
  }

  getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  }

  formatDuration(duration: number): string {
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  trackByEntryId(index: number, entry: CommandHistoryEntry): string {
    return entry.id;
  }

  /**
   * Export commands only (download as file)
   */
  async exportCommandsOnly(exportAll: boolean): Promise<void> {
    try {
      const entries = exportAll ? this.historyManager.history : this.filteredHistory;
      const content = this.historyManager.exportCommandsOnly(entries);
      
      if (!content) {
        alert('No commands to export');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const scope = exportAll ? 'all' : 'filtered';
             const filename = `command-history-commands-${scope}-${timestamp}.json`;
      
             const success = await this.historyManager.downloadExport(content, filename, 'application/json;charset=utf-8');
       if (success) {
         console.log(`Exported ${entries.length} commands to JSON file: ${filename}`);
       }
    } catch (error) {
      console.error('Error exporting commands only:', error);
      alert('Failed to export commands. Please try again.');
    }
  }

  /**
   * Export commands with output (download as file)
   */
  async exportCommandsWithOutput(exportAll: boolean): Promise<void> {
    try {
      const entries = exportAll ? this.historyManager.history : this.filteredHistory;
      const content = this.historyManager.exportCommandsWithOutput(entries);
      
      if (!content) {
        alert('No commands to export');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const scope = exportAll ? 'all' : 'filtered';
      const filename = `command-history-full-${scope}-${timestamp}.txt`;
      
      const success = await this.historyManager.downloadExport(content, filename);
      if (success) {
        console.log(`Exported ${entries.length} commands with output to file: ${filename}`);
      }
    } catch (error) {
      console.error('Error exporting commands with output:', error);
      alert('Failed to export commands with output. Please try again.');
    }
  }

  /**
   * Copy commands only to clipboard
   */
  async copyCommandsOnly(): Promise<void> {
    try {
      const content = this.historyManager.exportCommandsOnly(this.filteredHistory);
      
      if (!content) {
        alert('No commands to copy');
        return;
      }

      const success = await this.historyManager.copyExportToClipboard(content);
      if (success) {
        console.log(`Copied ${this.filteredHistory.length} commands to clipboard`);
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Error copying commands only:', error);
      alert('Failed to copy commands. Please try again.');
    }
  }

  /**
   * Copy commands with output to clipboard
   */
  async copyCommandsWithOutput(): Promise<void> {
    try {
      const content = this.historyManager.exportCommandsWithOutput(this.filteredHistory);
      
      if (!content) {
        alert('No commands to copy');
        return;
      }

      const success = await this.historyManager.copyExportToClipboard(content);
      if (success) {
        console.log(`Copied ${this.filteredHistory.length} commands with output to clipboard`);
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Error copying commands with output:', error);
      alert('Failed to copy commands with output. Please try again.');
    }
  }

  /**
   * Export as JSON
   */
  async exportAsJSON(exportAll: boolean): Promise<void> {
    try {
      const entries = exportAll ? this.historyManager.history : this.filteredHistory;
      const content = this.historyManager.exportAsJSON(entries);
      
      if (!content) {
        alert('No commands to export');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const scope = exportAll ? 'all' : 'filtered';
      const filename = `command-history-commands-${scope}-${timestamp}.json`;
      
      const success = await this.historyManager.downloadExport(content, filename);
      if (success) {
        console.log(`Exported ${entries.length} commands to file: ${filename}`);
      }
    } catch (error) {
      console.error('Error exporting commands as JSON:', error);
      alert('Failed to export commands as JSON. Please try again.');
    }
  }

  /**
   * Export as CSV
   */
  async exportAsCSV(exportAll: boolean): Promise<void> {
    try {
      const entries = exportAll ? this.historyManager.history : this.filteredHistory;
      const content = this.historyManager.exportAsCSV(entries);
      
      if (!content) {
        alert('No commands to export');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const scope = exportAll ? 'all' : 'filtered';
             const filename = `command-history-commands-${scope}-${timestamp}.csv`;
       
       const success = await this.historyManager.downloadExport(content, filename, 'text/csv;charset=utf-8');
       if (success) {
         console.log(`Exported ${entries.length} commands to CSV file: ${filename}`);
       }
    } catch (error) {
      console.error('Error exporting commands as CSV:', error);
      alert('Failed to export commands as CSV. Please try again.');
    }
  }

  /**
   * Export as Markdown
   */
  async exportAsMarkdown(exportAll: boolean): Promise<void> {
    try {
      const entries = exportAll ? this.historyManager.history : this.filteredHistory;
      const content = this.historyManager.exportAsMarkdown(entries);
      
      if (!content) {
        alert('No commands to export');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const scope = exportAll ? 'all' : 'filtered';
             const filename = `command-history-commands-${scope}-${timestamp}.md`;
       
       const success = await this.historyManager.downloadExport(content, filename, 'text/markdown;charset=utf-8');
       if (success) {
         console.log(`Exported ${entries.length} commands to Markdown file: ${filename}`);
       }
    } catch (error) {
      console.error('Error exporting commands as Markdown:', error);
      alert('Failed to export commands as Markdown. Please try again.');
    }
  }

  /**
   * Copy as JSON
   */
  async copyAsJSON(): Promise<void> {
    try {
      const content = this.historyManager.exportAsJSON(this.filteredHistory);
      
      if (!content) {
        alert('No commands to copy');
        return;
      }

      const success = await this.historyManager.copyExportToClipboard(content);
      if (success) {
        console.log(`Copied ${this.filteredHistory.length} commands as JSON to clipboard`);
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Error copying commands as JSON:', error);
      alert('Failed to copy commands as JSON. Please try again.');
    }
  }
} 