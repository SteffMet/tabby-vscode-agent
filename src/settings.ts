import { Injectable } from '@angular/core';
import { SettingsTabProvider } from 'tabby-settings';

import { McpSettingsTabComponent } from './components/mcpSettingsTab.component';

/** @hidden */
@Injectable()
export class McpSettingsTabProvider extends SettingsTabProvider {
    id = 'mcp';
    icon = 'terminal';
    title = 'MCP';

    getComponentType(): any {
        return McpSettingsTabComponent;
    }
}
