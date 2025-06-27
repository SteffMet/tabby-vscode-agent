import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { MinimizedDialogManagerService, MinimizedDialog } from '../services/minimizedDialogManager.service';
import { DialogManagerService } from '../services/dialogManager.service';

@Component({
  selector: 'minimized-dialogs-modal',
  template: `
    <div class="modal-header">
      <h4 class="modal-title">
        <i class="fas fa-window-minimize me-2"></i>
        Minimized Dialogs ({{minimizedDialogs.length}})
      </h4>
      <button type="button" class="btn-close" (click)="close()"></button>
    </div>
    
    <div class="modal-body">
      <div *ngIf="minimizedDialogs.length === 0" class="text-center text-muted py-4">
        <i class="fas fa-inbox fa-3x mb-3"></i>
        <p>No minimized dialogs</p>
      </div>
      
      <div class="list-group" *ngIf="minimizedDialogs.length > 0">
        <div *ngFor="let dialog of minimizedDialogs" 
             class="list-group-item d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <h6 class="mb-1">{{getDisplayTitle(dialog)}}</h6>
            <small class="text-muted">
              <i class="fas fa-clock me-1"></i>
              {{getRelativeTime(dialog.timestamp)}}
            </small>
          </div>
          <div class="btn-group" role="group">
            <button 
              class="btn btn-sm btn-primary"
              (click)="restoreDialog(dialog.id)"
              title="Restore dialog">
              <i class="fas fa-window-restore me-1"></i>
              Restore
            </button>
            <button 
              class="btn btn-sm btn-outline-danger"
              (click)="closeDialog(dialog.id)"
              title="Close dialog permanently">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="modal-footer" *ngIf="minimizedDialogs.length > 0">
      <button class="btn btn-outline-danger" (click)="clearAll()">
        <i class="fas fa-trash me-1"></i>
        Clear All
      </button>
      <button class="btn btn-secondary" (click)="close()">
        Close
      </button>
    </div>
  `
})
export class MinimizedDialogsModalComponent implements OnInit, OnDestroy {
  minimizedDialogs: MinimizedDialog[] = [];
  private subscription: Subscription;

  constructor(
    private activeModal: NgbActiveModal,
    private minimizedDialogManager: MinimizedDialogManagerService,
    private dialogManager: DialogManagerService,
    private modal: NgbModal
  ) { }

  ngOnInit(): void {
    this.subscription = this.minimizedDialogManager.minimizedDialogs$.subscribe(dialogs => {
      this.minimizedDialogs = dialogs;
      
      // Auto-close modal if no dialogs left
      if (dialogs.length === 0) {
        setTimeout(() => this.close(), 1000);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  close(): void {
    this.activeModal.dismiss();
  }

  /**
   * Restore a minimized dialog
   */
  async restoreDialog(dialogId: string): Promise<void> {
    const dialog = this.minimizedDialogManager.restoreDialog(dialogId);
    if (dialog) {
      try {
        console.log('Restoring dialog:', dialog.title);
        console.log('Dialog has promise resolver:', !!dialog.promiseResolver);
        
        // Close this modal first
        this.close();
        
        // Create a new dialog with the same component and data, but handle the result differently
        const modalRef = await this.createRestoredDialog(dialog);
        console.log('Created restored dialog modalRef:', !!modalRef);
        
        // Set up handlers for the restored dialog
        if (modalRef && dialog.promiseResolver) {
          modalRef.result.then(
            (result) => {
              console.log('Restored dialog completed with result:', result);
              console.log('About to resolve original promise with result:', result);
              // Use the stored promise resolver to continue the original workflow
              dialog.promiseResolver!.resolve(result);
              console.log('Original promise resolved successfully');
            },
            (reason) => {
              console.log('Restored dialog dismissed with reason:', reason);
              if (reason !== 'minimized') {
                console.log('Rejecting original promise with reason:', reason);
                // If not minimized again, reject the original promise
                dialog.promiseResolver!.reject(reason);
              } else {
                console.log('Dialog minimized again, keeping promise pending');
                // If minimized again, we need to store the promise resolver again
                // But first we need to get the minimized dialog that was just created
                const newMinimizedDialog = this.minimizedDialogManager.dialogs.find(d => d.instance?.command === dialog.instance?.command);
                if (newMinimizedDialog && dialog.promiseResolver) {
                  newMinimizedDialog.promiseResolver = dialog.promiseResolver;
                  this.minimizedDialogManager.minimizeDialog(newMinimizedDialog);
                }
              }
            }
          );
        } else {
          console.log('No modalRef or promise resolver available');
          if (!modalRef) console.log('modalRef is null');
          if (!dialog.promiseResolver) console.log('dialog.promiseResolver is null');
        }
        
      } catch (error) {
        console.error('Error restoring dialog:', error);
        
        // If restore fails, reject the original promise
        if (dialog.promiseResolver) {
          dialog.promiseResolver.reject(error);
        }
      }
    } else {
      console.log('No dialog found with ID:', dialogId);
    }
  }

  /**
   * Create a restored dialog without going through DialogManagerService
   * This prevents creating a new promise chain
   */
  private async createRestoredDialog(dialog: MinimizedDialog): Promise<any> {
    const modalRef = this.modal.open(dialog.component, {
      backdrop: 'static',
      keyboard: false,
      windowClass: 'restored-modal'
    });

    // Set properties on the component instance
    const props = this.getDialogProps(dialog);
    for (const key in props) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        modalRef.componentInstance[key] = props[key];
      }
    }

    // Make sure the restored dialog has access to MinimizedDialogManagerService
    // and generate a new dialogId so it can be minimized again
    if (modalRef.componentInstance) {
      modalRef.componentInstance.minimizedDialogManager = this.minimizedDialogManager;
      modalRef.componentInstance.dialogId = this.minimizedDialogManager.generateDialogId();
      
      console.log('Set minimizedDialogManager on restored dialog:', !!modalRef.componentInstance.minimizedDialogManager);
      console.log('Set new dialogId on restored dialog:', modalRef.componentInstance.dialogId);
    }

    return modalRef;
  }

  /**
   * Close a minimized dialog permanently
   */
  closeDialog(dialogId: string): void {
    this.minimizedDialogManager.closeMinimizedDialog(dialogId);
  }

  /**
   * Clear all minimized dialogs
   */
  clearAll(): void {
    this.minimizedDialogManager.clearAll();
  }

  /**
   * Get display title for a dialog
   */
  getDisplayTitle(dialog: MinimizedDialog): string {
    if (dialog.instance?.command) {
      // For command dialogs, show a truncated version of the command
      const cmd = dialog.instance.command;
      return cmd.length > 60 ? cmd.substring(0, 60) + '...' : cmd;
    }
    return dialog.title;
  }

  /**
   * Get relative time since dialog was minimized
   */
  getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // < 1 minute
      return 'just now';
    } else if (diff < 3600000) { // < 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // < 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
  }

  /**
   * Get the original props for a dialog component
   */
  private getDialogProps(dialog: MinimizedDialog): any {
    if (!dialog.instance) return {};

    // Extract properties from the original instance
    const props: any = {};
    
    // Common properties for command dialogs
    if (dialog.instance.command) props.command = dialog.instance.command;
    if (dialog.instance.tabId !== undefined) props.tabId = dialog.instance.tabId;
    if (dialog.instance.tabTitle) props.tabTitle = dialog.instance.tabTitle;
    if (dialog.instance.commandExplanation) props.commandExplanation = dialog.instance.commandExplanation;
    if (dialog.instance.output) props.output = dialog.instance.output;
    if (dialog.instance.exitCode !== undefined) props.exitCode = dialog.instance.exitCode;
    if (dialog.instance.aborted !== undefined) props.aborted = dialog.instance.aborted;
    if (dialog.instance.originalInstruction) props.originalInstruction = dialog.instance.originalInstruction;

    return props;
  }
} 