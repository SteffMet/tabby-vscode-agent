import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { LogService, Logger } from 'tabby-core';
import { Observable, Subject } from 'rxjs';

/**
 * Dialog request interface
 */
interface DialogRequest {
  component: any;
  options: any;
  props: any;
  resolve: (result: any) => void;
  reject: (reason: any) => void;
}

/**
 * Service to manage dialogs in the application
 * Ensures only one dialog is displayed at a time
 */
@Injectable({ providedIn: 'root' })
export class DialogManagerService {
  private activeDialog: NgbModalRef | null = null;
  private dialogQueue: DialogRequest[] = [];
  private logger: Logger;

  private dialogOpened = new Subject<any>();
  private dialogClosed = new Subject<any>();

  /** Observable that fires when a dialog is opened */
  get dialogOpened$(): Observable<any> { return this.dialogOpened; }

  /** Observable that fires when a dialog is closed */
  get dialogClosed$(): Observable<any> { return this.dialogClosed; }

  constructor(
    private ngbModal: NgbModal,
    log: LogService
  ) {
    this.logger = log.create('dialogManager');
  }

  /**
   * Check if a dialog is currently active
   */
  get hasActiveDialog(): boolean {
    return this.activeDialog !== null;
  }

  /**
   * Get the number of dialogs in the queue
   */
  get queueLength(): number {
    return this.dialogQueue.length;
  }

  /**
   * Open a dialog
   * @param component Component to open
   * @param options Modal options
   * @param props Properties to set on the component instance
   * @returns Promise with dialog result
   */
  async openDialog(component: any, options: any = {}, props: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: DialogRequest = {
        component,
        options,
        props,
        resolve,
        reject
      };

      // If there's no active dialog, show this one immediately
      if (!this.activeDialog) {
        this.showDialog(request);
      } else {
        // Otherwise, add it to the queue
        this.logger.debug(`Dialog queued, current queue length: ${this.dialogQueue.length}`);
        this.dialogQueue.push(request);
      }
    });
  }

  /**
   * Close the active dialog
   */
  closeActiveDialog(): void {
    if (this.activeDialog) {
      this.activeDialog.close();
    }
  }

  /**
   * Clear the dialog queue
   */
  clearQueue(): void {
    // Reject all queued dialogs
    for (const request of this.dialogQueue) {
      request.reject(new Error('Dialog queue cleared'));
    }
    this.dialogQueue = [];
  }

  /**
   * Show a dialog
   * @param request Dialog request
   */
  private showDialog(request: DialogRequest): void {
    try {
      this.activeDialog = this.ngbModal.open(request.component, request.options);

      // Set properties on the component instance
      for (const key in request.props) {
        if (Object.prototype.hasOwnProperty.call(request.props, key)) {
          this.activeDialog.componentInstance[key] = request.props[key];
        }
      }

      // Emit dialog opened event
      this.dialogOpened.next({
        component: request.component,
        instance: this.activeDialog.componentInstance
      });

      // Handle dialog result
      this.activeDialog.result.then(
        (result) => {
          this.handleDialogClosed(result);
          request.resolve(result);
        },
        (reason) => {
          this.handleDialogClosed(null, reason);
          request.reject(reason);
        }
      );
    } catch (error) {
      this.logger.error('Error opening dialog:', error);
      this.handleDialogClosed(null, error);
      request.reject(error);
    }
  }

  /**
   * Handle dialog closed
   * @param result Dialog result
   * @param error Error if dialog was rejected
   */
  private handleDialogClosed(result?: any, error?: any): void {
    // Emit dialog closed event
    this.dialogClosed.next({
      result,
      error
    });

    this.activeDialog = null;

    // If there are more dialogs in the queue, show the next one
    if (this.dialogQueue.length > 0) {
      const nextRequest = this.dialogQueue.shift();
      if (nextRequest) {
        this.logger.debug(`Showing next dialog from queue, remaining: ${this.dialogQueue.length}`);
        setTimeout(() => this.showDialog(nextRequest), 100); // Small delay to ensure previous dialog is fully closed
      }
    }
  }
}
