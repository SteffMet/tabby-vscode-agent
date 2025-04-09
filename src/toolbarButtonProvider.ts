import { Injectable } from '@angular/core';
import { ToolbarButtonProvider, ToolbarButton } from 'tabby-core';
import { ExecToolCategory } from './tools/terminal';

@Injectable()
export class McpToolbarButtonProvider extends ToolbarButtonProvider {
    private execCommandRunning = false;
    
    constructor(
        private execToolCategory: ExecToolCategory
    ) {
        super();
        
        // Subscribe to changes in active command
        this.execToolCategory.activeCommand$.subscribe(command => {
            this.execCommandRunning = !!command;
        });
    }
    
    provide(): ToolbarButton[] {
        if (!this.execCommandRunning) {
            return [];
        }
        
        return [
            {
                icon: `
                    <svg width="16" height="16" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M432 256c0 17.7-14.3 32-32 32H48c-17.7 0-32-14.3-32-32s14.3-32 32-32h352c17.7 0 32 14.3 32 32z"/>
                    </svg>
                `,
                weight: 5,
                title: 'Abort command',
                click: () => {
                    this.execToolCategory.abortCurrentCommand();
                }
            }
        ];
    }
} 