import { Injectable } from '@angular/core';
import { CommandResultDialogComponent } from '../components/commandResultDialog.component';
import { ConfirmCommandDialogComponent } from '../components/confirmCommandDialog.component';
import { DialogManagerService } from './dialogManager.service';

/**
 * Service to manage dialogs in the application
 * Uses DialogManagerService to ensure only one dialog is displayed at a time
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
    constructor(private dialogManager: DialogManagerService) {}

    /**
     * Show command confirmation dialog
     * @param command Command to execute
     * @param tabId Tab ID
     * @param tabTitle Tab title
     * @param commandExplanation Optional explanation of what the command does
     * @returns Promise with dialog result
     */
    async showConfirmCommandDialog(
        command: string,
        tabId: number,
        tabTitle: string,
        commandExplanation?: string
    ): Promise<any> {
        return this.dialogManager.openDialog(
            ConfirmCommandDialogComponent,
            { backdrop: 'static' },
            {
                command,
                tabId,
                tabTitle,
                commandExplanation
            }
        );
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
        return this.dialogManager.openDialog(
            CommandResultDialogComponent,
            {
                backdrop: 'static',
                size: 'lg'
            },
            {
                command,
                output,
                exitCode,
                aborted,
                originalInstruction
            }
        );
    }
}
