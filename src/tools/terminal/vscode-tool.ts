import { Injectable } from '@angular/core';
import { McpTool, McpResponse, createSuccessResponse } from '../../type/types';
import { AppService } from 'tabby-core';

@Injectable({ providedIn: 'root' })
export class VSCodeTool {
    constructor(private app: AppService) { }

    handler = async () => {
        this.app.emit('mcp-run-command', {
            command: 'workbench.action.chat.openInNewWindow',
        });
        return createSuccessResponse('Command sent to open VSCode chat window');
    }

    getTool(): McpTool<any> {
        return {
            name: 'open-vscode-chat',
            description: 'Opens VSCode chat window',
            schema: {},
            handler: this.handler,
        };
    }
}