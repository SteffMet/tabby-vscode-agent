import { Component, HostBinding } from '@angular/core';
import { ConfigService } from 'tabby-core';

/** @hidden */
@Component({
    templateUrl: './mcpSettingsTab.component.pug',
})
export class McpSettingsTabComponent {
    @HostBinding('class.content-box') true

    constructor(
        public config: ConfigService,
    ) { }
}
