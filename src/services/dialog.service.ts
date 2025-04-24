import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommandResultDialogComponent } from '../components/commandResultDialog.component';
import { ConfirmCommandDialogComponent } from '../components/confirmCommandDialog.component';

/**
 * Service to manage dialogs in the application
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
    constructor(private ngbModal: NgbModal) {}

    /**
     * Show command confirmation dialog
     * @param command Command to execute
     * @param tabId Tab ID
     * @param tabTitle Tab title
     * @returns Promise with dialog result
     */
    async showConfirmCommandDialog(command: string, tabId: number, tabTitle: string): Promise<any> {
        const modalRef = this.ngbModal.open(ConfirmCommandDialogComponent, { backdrop: 'static' });
        modalRef.componentInstance.command = command;
        modalRef.componentInstance.tabId = tabId;
        modalRef.componentInstance.tabTitle = tabTitle;
        
        return modalRef.result;
    }

    /**
     * Show command result dialog
     * @param command Command executed
     * @param output Command output
     * @param exitCode Exit code
     * @param aborted Whether the command was aborted
     * @param originalInstruction Original instruction
     * @returns Promise with dialog result
     */
    async showCommandResultDialog(
        command: string, 
        output: string, 
        exitCode: number | null, 
        aborted: boolean,
        originalInstruction: string = ''
    ): Promise<any> {
        const modalRef = this.ngbModal.open(CommandResultDialogComponent, { 
            backdrop: 'static',
            size: 'lg'
        });
        
        modalRef.componentInstance.command = command;
        modalRef.componentInstance.output = output;
        modalRef.componentInstance.exitCode = exitCode;
        modalRef.componentInstance.aborted = aborted;
        modalRef.componentInstance.originalInstruction = originalInstruction;
        
        return modalRef.result;
    }
}
