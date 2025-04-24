import { Injectable } from '@angular/core';
import { HotkeyDescription, HotkeyProvider, TranslateService } from 'tabby-core';

/**
 * Provider for MCP-specific hotkeys
 */
@Injectable()
export class McpHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'abort-command',
            name: this.translate.instant('Abort running command'),
        },
        {
            id: 'confirm-dialog',
            name: this.translate.instant('Confirm dialog action'),
        },
        {
            id: 'reject-dialog',
            name: this.translate.instant('Reject dialog action'),
        },
    ];

    constructor(
        private translate: TranslateService,
    ) { 
        super();
    }

    async provide(): Promise<HotkeyDescription[]> {
        return this.hotkeys;
    }
}
