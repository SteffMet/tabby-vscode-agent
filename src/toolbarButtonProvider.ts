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
import { McpHotkeyService } from './services/mcpHotkey.service';

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
        private runningCommandsManager: RunningCommandsManagerService,
        private mcpHotkeyService: McpHotkeyService
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
        const runningIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-terminal" viewBox="0 0 16 16"><path d="M6 9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 9zM3.854 4.146a.5.5 0 1 0-.708.708L4.793 6.5 3.146 8.146a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2z"/><path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12z"/></svg>`;
        const minimizedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-window-minimize" viewBox="0 0 16 16"><path d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z"/></svg>`;
        const historyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zM5.56 2.29a7.007 7.007 0 0 0-1.285.952l-.732-.686a8.005 8.005 0 0 1 1.482-1.075l.533.813zM2.29 5.56a7.007 7.007 0 0 0-.952 1.285l.686.732a8.005 8.005 0 0 1 1.075-1.482l-.813-.533zM1.019 8.515a7 7 0 0 0 .022.589l.997.074A8 8 0 0 1 1 8H0v1a8 8 0 0 1 1.019-.485l-.022-.997zM14.981 8.515a7 7 0 0 1-.022.589l-.997.074A8 8 0 0 0 15 8h1v1a8 8 0 0 0-1.019-.485l.022-.997zM13.71 5.56a7.007 7.007 0 0 1 .952 1.285l-.686.732a8.005 8.005 0 0 0-1.075-1.482l.813-.533zM10.44 2.29a7.007 7.007 0 0 1 1.285.952l.732-.686a8.005 8.005 0 0 0-1.482-1.075l-.533.813z"/><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>`;
        const copilotIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat-dots" viewBox="0 0 16 16">
  <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
  <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9 9 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.4 10.4 0 0 1-.524 2.318l-.003.011a11 11 0 0 1-.244.637c-.079.186.074.394.273.362a22 22 0 0 0 .693-.125m.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6-3.004 6-7 6a8 8 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a11 11 0 0 0 .398-2"/>
</svg>
`;

        return [
            {
                icon: runningIcon,
                weight: 5,
                title: this.activeCommandsCount > 0 ? `Running Commands (${this.activeCommandsCount})` : 'Running Commands',
                click: () => {
                    this.showRunningCommandsModal();
                }
            },
            {
                icon: minimizedIcon,
                weight: 6,
                title: this.minimizedDialogsCount > 0 ? `Minimized Dialogs (${this.minimizedDialogsCount})` : 'Minimized Dialogs',
                click: () => {
                    this.showMinimizedDialogsModal();
                }
            },
            {
                icon: historyIcon,
                weight: 7,
                title: this.commandHistoryCount > 0 ? `Command History (${this.commandHistoryCount})` : 'Command History',
                click: () => {
                    this.showCommandHistoryModal();
                }
            },
            {
                icon: copilotIcon,
                weight: 8,
                title: 'Open Copilot Chat',
                click: () => {
                    this.mcpHotkeyService.openCopilot();
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