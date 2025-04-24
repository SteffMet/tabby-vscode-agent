import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

/**
 * Dialog component for confirming command execution
 */
@Component({
  templateUrl: './confirmCommandDialog.component.pug',
})
export class ConfirmCommandDialogComponent {
  @Input() command: string;
  @Input() tabId: number;
  @Input() tabTitle: string;

  constructor(
    public modal: NgbActiveModal
  ) { }

  confirm(): void {
    this.modal.close({ confirmed: true });
  }

  cancel(): void {
    this.modal.close({ confirmed: false });
  }
}
