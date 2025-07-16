import { Injectable } from '@angular/core';
import { HotkeyProvider } from 'tabby-core';
import type { HotkeyDescription } from 'tabby-core';

/** @hidden */
@Injectable()
export class McpHotkeyProvider extends HotkeyProvider {
    async provide(): Promise<HotkeyDescription[]> {
        return [
            {
                id: 'mcp-abort-command',
                name: 'Abort running MCP command',
            },
            {
                id: 'mcp-show-command-history',
                name: 'Show MCP command history',
            },
            {
                id: 'mcp-show-running-commands',
                name: 'Show running MCP commands',
            },
            {
                id: 'mcp-open-copilot',
                name: 'Open Copilot window',
            },
        ];
    }
} 