import { Component, HostBinding } from '@angular/core';
import { ConfigService } from 'tabby-core';
import { McpService } from '../services/mcpService';
import { McpLoggerService } from '../services/mcpLogger.service';

/** @hidden */
@Component({
    templateUrl: './mcpSettingsTab.component.pug',
})
export class McpSettingsTabComponent {
    @HostBinding('class.content-box') true
    isServerRunning = false;

    constructor(
        public config: ConfigService,
        private mcpService: McpService,
        private logger: McpLoggerService
    ) {
        // Check initial server status
        this.updateServerStatus();
    }

    async startServer(): Promise<void> {
        try {
            await this.mcpService.startServer();
            this.updateServerStatus();
            this.logger.info('MCP server started successfully');
        } catch (error) {
            this.logger.error('Failed to start MCP server', error);
        }
    }

    async stopServer(): Promise<void> {
        try {
            await this.mcpService.stopServer();
            this.updateServerStatus();
            this.logger.info('MCP server stopped successfully');
        } catch (error) {
            this.logger.error('Failed to stop MCP server', error);
        }
    }

    private async updateServerStatus(): Promise<void> {
        this.isServerRunning = await this.mcpService.isServerRunning();
    }

    toggleDebugLogging(): void {
        this.config.save();
        const enabled = this.config.store.mcp.enableDebugLogging;
        this.logger.setDebugEnabled(enabled);
        this.logger.info(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
    }
}
