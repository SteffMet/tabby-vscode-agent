import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/**
 * Dialog component for displaying command execution results
 */
@Component({
  templateUrl: './commandResultDialog.component.pug',
})
export class CommandResultDialogComponent {
  @Input() command: string;
  @Input() output: string;
  @Input() exitCode: number | null;
  @Input() aborted: boolean;
  @Input() originalInstruction: string = '';

  // User message input
  userMessage: string = '';

  // Rejection message
  rejectionMessage: string = '';

  constructor(
    public modal: NgbActiveModal
  ) { }

  /**
   * Accept the command result with user message
   */
  accept(): void {
    this.modal.close({
      accepted: true,
      userMessage: this.userMessage
    });
  }

  /**
   * Show rejection dialog
   */
  async reject(): Promise<void> {
    // Create a simple prompt for rejection message
    const rejectionMessage = prompt('Please enter a reason for rejection:');

    if (rejectionMessage !== null) {
      this.modal.close({
        accepted: false,
        rejectionMessage: rejectionMessage
      });
    }
  }

  /**
   * Cancel and close the dialog
   */
  cancel(): void {
    this.modal.close();
  }
}
