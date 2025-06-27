import { Injectable } from '@angular/core';
import { ToolbarButtonProvider, ToolbarButton } from 'tabby-core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExecToolCategory } from './tools/terminal';
import { MinimizedDialogsModalComponent } from './components/minimizedModal.component';
import { MinimizedDialogManagerService } from './services/minimizedDialogManager.service';
import { CommandHistoryModalComponent } from './components/commandHistoryModal.component';
import { CommandHistoryManagerService } from './services/commandHistoryManager.service';
import { RunningCommandsDialogComponent } from './components/runningCommandsDialog.component';
import { RunningCommandsManagerService } from './services/runningCommandsManager.service';

@Injectable()
export class McpToolbarButtonProvider extends ToolbarButtonProvider {
    private activeCommandsCount = 0;
    private minimizedDialogsCount = 0;
    private commandHistoryCount = 0;
    
    constructor(
        private execToolCategory: ExecToolCategory,
        private modal: NgbModal,
        private minimizedDialogManager: MinimizedDialogManagerService,
        private commandHistoryManager: CommandHistoryManagerService,
        private runningCommandsManager: RunningCommandsManagerService
    ) {
        super();
        
        // Subscribe to changes in running commands
        this.runningCommandsManager.runningCommands$.subscribe(commands => {
            this.activeCommandsCount = commands.length;
        });
        
        // Subscribe to minimized dialogs changes
        this.minimizedDialogManager.minimizedDialogs$.subscribe(dialogs => {
            this.minimizedDialogsCount = dialogs.length;
        });
        
        // Subscribe to command history changes
        this.commandHistoryManager.commandHistory$.subscribe(history => {
            this.commandHistoryCount = history.length;
        });
    }
    
    provide(): ToolbarButton[] {
        return [
            {
                icon: `
                    <svg width="16" height="16" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z${this.activeCommandsCount > 0 ? 'M224 160a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM288 192a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm-32 64c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V288c0-17.7-14.3-32-32-32z' : 'M208 240c0 26.5 21.5 48 48 48s48-21.5 48-48c0-26.5-21.5-48-48-48s-48 21.5-48 48z'}"/>
                    </svg>
                `,
                weight: 5,
                title: this.activeCommandsCount > 0 ? `Running Commands (${this.activeCommandsCount})` : 'Running Commands',
                click: () => {
                    this.showRunningCommandsModal();
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
                    this.showMinimizedDialogsModal();
                }
            },
            {
                icon: `
                    <svg width="16" height="16" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M75 75L41 41C25.9 25.9 0 36.6 0 57.9V168c0 13.3 10.7 24 24 24H134.1c21.4 0 32.1-25.9 17-41l-30.8-30.8C155 85.5 203 64 256 64c106 0 192 86 192 192s-86 192-192 192c-40.8 0-78.6-12.7-109.7-34.4c-14.5-10.1-34.4-6.6-44.6 7.9s-6.6 34.4 7.9 44.6C151.2 495 201.7 512 256 512c141.4 0 256-114.6 256-256S397.4 0 256 0C185.3 0 121.3 28.7 75 75zm181 53c-13.3 0-24 10.7-24 24V256c0 6.4 2.5 12.5 7 17l72 72c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-65-65V152c0-13.3-10.7-24-24-24z"/>
                    </svg>
                `,
                weight: 7,
                title: this.commandHistoryCount > 0 ? `Command History (${this.commandHistoryCount})` : 'Command History',
                click: () => {
                    this.showCommandHistoryModal();
                }
            }
        ];
    }
    
    private showMinimizedDialogsModal(): void {
        this.modal.open(MinimizedDialogsModalComponent, {
            size: 'lg',
            backdrop: true,
            keyboard: true
        });
    }
    
    private showCommandHistoryModal(): void {
        this.modal.open(CommandHistoryModalComponent, {
            size: 'xl',
            backdrop: true,
            keyboard: true
        });
    }
    
    private showRunningCommandsModal(): void {
        this.modal.open(RunningCommandsDialogComponent, {
            size: 'lg',
            backdrop: true,
            keyboard: true
        });
    }
} 