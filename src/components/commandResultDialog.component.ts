import { Component, Input, NgModule, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { HotkeysService } from 'tabby-core';
import { MinimizedDialogManagerService } from '../services/minimizedDialogManager.service';

/**
 * Dialog component for displaying command execution results
 */
@Component({
  template: require('./commandResultDialog.component.pug').default,
})
export class CommandResultDialogComponent implements AfterViewInit, OnDestroy {
  @Input() command: string;

  private _output: string = '';
  @Input()
  set output(value: string) {
    this._output = value;
    // If the component is already initialized, adjust the textarea height
    if (this.outputTextareaRef?.nativeElement) {
      setTimeout(() => this.adjustTextareaHeight(this.outputTextareaRef.nativeElement), 0);
    }
  }
  get output(): string {
    return this._output;
  }

  @Input() exitCode: number | null;
  @Input() aborted: boolean;
  @Input() originalInstruction: string = '';

  // User message input
  userMessage: string = '';

  // Rejection message
  rejectionMessage: string = '';

  // Flag to show if we're in reject mode
  isRejectMode: boolean = false;

  // Reference to the message textarea
  @ViewChild('messageTextarea') messageTextareaRef: ElementRef<HTMLTextAreaElement>;

  // Reference to the output textarea
  @ViewChild('outputTextarea') outputTextareaRef: ElementRef<HTMLTextAreaElement>;

  // Track if hotkeys are paused
  private hotkeysPaused = false;

  // Dialog ID for minimize/restore functionality
  public dialogId: string = '';

  constructor(
    public modal: NgbActiveModal,
    private hotkeysService: HotkeysService,
    private minimizedDialogManager: MinimizedDialogManagerService
  ) {
    this.dialogId = this.minimizedDialogManager.generateDialogId();
  }

  /**
   * After view init, focus the textarea and pause hotkeys
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      // Focus the dialog element to capture keyboard events
      if (this.modal) {
        const modalElement = document.querySelector('.modal-content') as HTMLElement;
        if (modalElement) {
          // Add tabindex to make the modal focusable
          if (!modalElement.hasAttribute('tabindex')) {
            modalElement.setAttribute('tabindex', '-1');
          }

          // Add focused class for visual indication
          modalElement.classList.add('focused');

          // Focus the modal
          modalElement.focus();

          // Add event listener to prevent focus from leaving the modal
          document.addEventListener('focusin', this.keepFocusInModal);
        }
      }

      // Set the output textarea to the correct height based on content
      if (this.outputTextareaRef?.nativeElement) {
        // Adjust the height to fit the content
        this.adjustTextareaHeight(this.outputTextareaRef.nativeElement);
      }

      // Pause hotkeys while dialog is open
      this.pauseHotkeys();
    }, 100);
  }

  /**
   * Event handler to keep focus inside the modal
   */
  private keepFocusInModal = (event: FocusEvent) => {
    const modalElement = document.querySelector('.modal-content') as HTMLElement;
    if (modalElement && !modalElement.contains(event.target as Node)) {
      // If focus is outside the modal, bring it back
      modalElement.focus();
    }
  }

  /**
   * Adjust textarea height to fit content
   * @param textarea Textarea element to adjust
   */
  private adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
    // Reset height to calculate the proper scrollHeight
    textarea.style.height = 'auto';

    // Set the height to match the scrollHeight (content height)
    const scrollHeight = textarea.scrollHeight;
    if (scrollHeight > 0) {
      // Limit max height to 300px (same as CSS max-height)
      const maxHeight = 300;
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
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
   * Handle escape key to close dialog or cancel reject mode
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
    if (this.isRejectMode) {
      this.toggleRejectMode();
    } else {
      this.cancel();
    }
  }

  /**
   * Handle R key to toggle reject mode
   */
  @HostListener('document:keydown.r', ['$event'])
  onRPressed(event: KeyboardEvent): void {
    // Only handle if not in a text input
    if (document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement) {
      return;
    }

    event.preventDefault();
    this.reject();
  }

  /**
   * Handle Enter key to accept
   */
  @HostListener('document:keydown.enter', ['$event'])
  onEnterPressed(event: KeyboardEvent): void {
    // Only handle if not in a text input
    if (document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement) {
      return;
    }

    event.preventDefault();
    // Always call accept, which will handle the mode switching if needed
    this.accept();
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

      if (this.isRejectMode) {
        this.reject();
      } else {
        this.accept();
      }
    }
  }

  /**
   * Accept the command result with user message
   */
  accept(): void {
    // If in reject mode, switch to accept mode first
    if (this.isRejectMode) {
      this.toggleRejectMode();
      return;
    }

    // If already in accept mode, submit the acceptance
    this.resumeHotkeys();
    this.modal.close({
      accepted: true,
      userMessage: this.userMessage
    });
  }

  /**
   * Toggle rejection mode
   */
  toggleRejectMode(): void {
    this.isRejectMode = !this.isRejectMode;

    if (this.isRejectMode) {
      // If entering reject mode, copy current message to rejection message
      this.rejectionMessage = this.userMessage;
      this.userMessage = '';

      // Focus the textarea after a short delay
      setTimeout(() => {
        if (this.messageTextareaRef?.nativeElement) {
          this.messageTextareaRef.nativeElement.focus();
        }
      }, 100);
    } else {
      // If exiting reject mode, restore previous message
      this.userMessage = this.rejectionMessage;
      this.rejectionMessage = '';
    }
  }

  /**
   * Submit rejection with message
   */
  reject(): void {
    if (!this.isRejectMode) {
      // If not in reject mode, toggle to reject mode
      this.toggleRejectMode();
      return;
    }

    // If already in reject mode, submit the rejection
    if (!this.userMessage.trim()) {
      // If no reason provided, ask for one
      alert('Please provide a reason for rejection.');
      return;
    }

    this.resumeHotkeys();
    this.modal.close({
      accepted: false,
      rejectionMessage: this.userMessage
    });
  }

  /**
   * Cancel and close the dialog
   */
  cancel(): void {
    this.resumeHotkeys();
    this.modal.close();
  }

  /**
   * Minimize the dialog
   */
  minimize(): void {
    console.log('Minimizing command result dialog');
    
    // Create minimized dialog object
    const minimizedDialog = {
      id: this.dialogId,
      title: `Result: ${this.command.length > 40 ? this.command.substring(0, 40) + '...' : this.command}`,
      component: CommandResultDialogComponent,
      instance: this,
      modalRef: this.modal,
      timestamp: Date.now()
    };
    
    // Add to minimized dialogs
    this.minimizedDialogManager.minimizeDialog(minimizedDialog);
    
    // Dismiss the modal with 'minimized' reason
    this.resumeHotkeys();
    this.modal.dismiss('minimized');
  }

  /**
   * Clean up when component is destroyed
   */
  ngOnDestroy(): void {
    this.resumeHotkeys();

    // Remove the focus event listener
    document.removeEventListener('focusin', this.keepFocusInModal);

    // Remove focused class from modal if it exists
    const modalElement = document.querySelector('.modal-content') as HTMLElement;
    if (modalElement) {
      modalElement.classList.remove('focused');
    }
  }
}

/**
 * Module for CommandResultDialogComponent
 * This allows the component to be used with NgModel
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule
  ],
  declarations: [
    CommandResultDialogComponent
  ],
  exports: [
    CommandResultDialogComponent
  ]
  // HotkeysService is provided at the root level
})
export class CommandResultDialogModule { }
