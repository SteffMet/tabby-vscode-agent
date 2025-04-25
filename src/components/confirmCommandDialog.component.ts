import { Component, Input, NgModule, AfterViewInit, HostListener, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { HotkeysService } from 'tabby-core';

/**
 * Dialog component for confirming command execution
 */
@Component({
  templateUrl: './confirmCommandDialog.component.pug',
})
export class ConfirmCommandDialogComponent implements AfterViewInit, OnDestroy {
  @Input() command: string;
  @Input() tabId: number;
  @Input() tabTitle: string;

  // Flag to show/hide reject input form
  showRejectInput = false;

  // Rejection message
  rejectMessage: string = '';

  // Reference to the reject message textarea
  @ViewChild('rejectMessageTextarea') rejectMessageTextareaRef: ElementRef<HTMLTextAreaElement>;

  // Track if hotkeys are paused
  private hotkeysPaused = false;

  constructor(
    public modal: NgbActiveModal,
    private hotkeysService: HotkeysService,
  ) { }

  /**
   * After view init, pause hotkeys
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      // Pause hotkeys while dialog is open
      this.pauseHotkeys();
      // Focus the dialog element to capture keyboard events
      if (this.modal) {
        const modalElement = document.querySelector('.modal-content') as HTMLElement;
        if (modalElement) {
          modalElement.focus();
        }
      }
    }, 100);
  }

  /**
   * Pause hotkeys when the dialog is focused
   */
  pauseHotkeys(): void {
    if (!this.hotkeysPaused) {
      this.hotkeysService.disable();
      this.hotkeysPaused = true;
    }
  }

  /**
   * Restore hotkeys when the dialog is closed
   */
  resumeHotkeys(): void {
    if (this.hotkeysPaused) {
      this.hotkeysService.enable();
      this.hotkeysPaused = false;
    }
  }

  /**
   * Handle escape key to close dialog
   */
  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    const modalElement = document.querySelector('.modal-content') as HTMLElement;
    if (modalElement) {
      if (document.activeElement !== modalElement) {
        modalElement.focus();
        return;
      }
    }
    this.cancel();
  }

  /**
   * Handle enter key to confirm
   */
  @HostListener('document:keydown.enter', ['$event'])
  onEnterPressed(event: KeyboardEvent): void {
    // Only handle if not in textarea
    if (!(event.target instanceof HTMLTextAreaElement)) {
      if (this.showRejectInput) {
        // If reject form is shown, confirm rejection
        if (this.rejectMessage.trim()) {
          this.reject();
        }
      } else {
        // Otherwise confirm execution
        this.confirm();
      }
    }
  }

  /**
   * Handle 'r' key to show reject form
   */
  @HostListener('document:keydown.r', ['$event'])
  onRKeyPressed(event: KeyboardEvent): void {
    // Only handle if not in textarea and reject form not shown
    if (!(event.target instanceof HTMLTextAreaElement) && !this.showRejectInput) {
      this.showRejectForm();
    }
  }

  /**
   * Handle keydown events in the textarea
   * @param event Keyboard event
   */
  onTextareaKeyDown(event: KeyboardEvent): void {
    // Handle Shift+Enter to add a new line
    if (event.key === 'Enter' && event.shiftKey) {
      // Let the default behavior happen (add a new line)
      return;
    }

    // Handle Enter to submit the form
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.reject();
    }
  }

  /**
   * Confirm command execution
   */
  confirm(): void {
    this.resumeHotkeys();
    this.modal.close({ confirmed: true });
  }

  /**
   * Show the reject form
   */
  showRejectForm(): void {
    this.showRejectInput = true;

    // Focus the textarea after it's shown
    setTimeout(() => {
      if (this.rejectMessageTextareaRef?.nativeElement) {
        this.rejectMessageTextareaRef.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Reject command execution with a reason
   */
  reject(): void {
    if (!this.rejectMessage.trim()) {
      // If no reason provided, ask for one
      alert('Please provide a reason for rejection.');
      return;
    }

    this.resumeHotkeys();
    this.modal.close({
      confirmed: false,
      rejected: true,
      rejectMessage: this.rejectMessage
    });
  }

  /**
   * Cancel command execution
   */
  cancel(): void {
    this.resumeHotkeys();
    this.modal.close({ confirmed: false });
  }

  /**
   * Clean up when component is destroyed
   */
  ngOnDestroy(): void {
    this.resumeHotkeys();
  }
}

/**
 * Module for ConfirmCommandDialogComponent
 * This allows the component to be used with NgModel
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule
  ],
  declarations: [
    ConfirmCommandDialogComponent
  ],
  exports: [
    ConfirmCommandDialogComponent
  ],
  // HotkeysService is provided at the root level
})
export class ConfirmCommandDialogModule { }
