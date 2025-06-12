import { Injectable } from '@angular/core';
import { ToolbarButtonProvider, ToolbarButton } from 'tabby-core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExecToolCategory } from './tools/terminal';
import { MinimizedDialogsModalComponent } from './components/minimizedModal.component';
import { MinimizedDialogManagerService } from './services/minimizedDialogManager.service';

@Injectable()
export class McpToolbarButtonProvider extends ToolbarButtonProvider {
    private execCommandRunning = false;
    private minimizedDialogsCount = 0;
    
    constructor(
        private execToolCategory: ExecToolCategory,
        private modal: NgbModal,
        private minimizedDialogManager: MinimizedDialogManagerService
    ) {
        super();
        
        // Subscribe to changes in active command
        this.execToolCategory.activeCommand$.subscribe(command => {
            this.execCommandRunning = !!command;
        });
        
        // Subscribe to minimized dialogs changes
        this.minimizedDialogManager.minimizedDialogs$.subscribe(dialogs => {
            this.minimizedDialogsCount = dialogs.length;
        });
    }
    
    provide(): ToolbarButton[] {
        return [
            {
                icon: `
                    <svg width="16" height="16" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M432 256c0 17.7-14.3 32-32 32H48c-17.7 0-32-14.3-32-32s14.3-32 32-32h352c17.7 0 32 14.3 32 32z"/>
                    </svg>
                `,
                weight: 5,
                title: this.execCommandRunning ? 'Abort command (running)' : 'MCP Status (idle)',
                click: () => {
                    if (this.execCommandRunning) {
                        this.execToolCategory.abortCurrentCommand();
                    }
                }
            },
            {
                icon: `
                    <svg width="16" height="16" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h48c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/>
                    </svg>
                `,
                weight: 6,
                title: this.minimizedDialogsCount > 0 ? `Minimized Dialogs (${this.minimizedDialogsCount})` : 'Minimized Dialogs',
                click: () => {
                    this.showTestModal();
                }
            }
        ];
    }
    
    private showTestModal(): void {
        this.modal.open(MinimizedDialogsModalComponent, {
            size: 'lg',
            backdrop: true,
            keyboard: true
        });
    }
} 